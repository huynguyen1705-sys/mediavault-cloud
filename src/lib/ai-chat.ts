import prisma from "@/lib/db";
import { getPresignedUrl } from "@/lib/r2";
import { generateEmbedding } from "@/lib/embeddings";
import { generateCollections } from "@/lib/collections";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://cdn.fii.one";
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";

interface FileRef {
  id: string;
  name: string;
  mimeType: string | null;
  fileSize: string;
  url: string | null;
  thumbnailUrl: string | null;
  folderName: string;
  createdAt: string;
}

interface ChatResponse {
  reply: string;
  files: FileRef[];
  action?: string;
}

/**
 * Process a chat message from the user.
 * Parses intent and returns a response with optional file references.
 */
export async function processChat(
  userId: string,
  message: string,
  conversationHistory: { role: string; content: string }[]
): Promise<ChatResponse> {
  // Build context about user's files
  const totalFiles = await prisma.file.count({ where: { userId, deletedAt: null } });
  const totalSize = await prisma.file.aggregate({
    where: { userId, deletedAt: null },
    _sum: { fileSize: true },
  });
  const folders = await prisma.folder.findMany({
    where: { userId },
    select: { name: true, _count: { select: { files: true } } },
  });
  const fileTypes = await prisma.$queryRaw<{ mime: string; count: bigint }[]>`
    SELECT SPLIT_PART(mime_type, '/', 1) as mime, COUNT(*)::bigint as count
    FROM files WHERE user_id = ${userId}::uuid AND deleted_at IS NULL
    GROUP BY mime ORDER BY count DESC
  `;

  const folderSummary = folders.map(f => `${f.name} (${f._count.files} files)`).join(", ");
  const typeSummary = fileTypes.map(t => `${t.mime}: ${t.count}`).join(", ");
  const totalSizeGB = Number(totalSize._sum.fileSize || 0) / (1024 * 1024 * 1024);

  // Try semantic search if message looks like a search query
  let searchResults: any[] = [];
  try {
    const embResult = await generateEmbedding(message, {
      apiKey: process.env.NVIDIA_API_KEY || "",
    });
    const embedding = embResult?.embedding;
    if (embedding) {
      searchResults = await prisma.$queryRaw<any[]>`
        SELECT f.id, f.name, f.mime_type, f.file_size::text, f.storage_path,
               f.thumbnail_path, f.created_at,
               fo.name as folder_name,
               1 - (fe.embedding <=> ${embedding}::vector) as similarity
        FROM file_embeddings fe
        JOIN files f ON f.id = fe.file_id
        LEFT JOIN folders fo ON fo.id = f.folder_id
        WHERE f.user_id = ${userId}::uuid AND f.deleted_at IS NULL
        ORDER BY fe.embedding <=> ${embedding}::vector
        LIMIT 10
      `;
    }
  } catch (e) {
    console.error("Chat search error:", e);
  }

  const relevantFiles = searchResults
    .filter((r: any) => r.similarity > 0.3)
    .slice(0, 5);

  const fileContext = relevantFiles.length > 0
    ? `\n\nRelevant files found:\n${relevantFiles.map((f: any, i: number) => 
        `${i + 1}. "${f.name}" (${f.mime_type}, ${formatBytes(Number(f.file_size))}, in ${f.folder_name || 'My Files'}, similarity: ${(f.similarity * 100).toFixed(0)}%)`
      ).join("\n")}`
    : "";

  // Call Gemini for conversational response
  const systemPrompt = `You are a smart file assistant for a cloud storage service called fii.one.
The user has ${totalFiles} files (${totalSizeGB.toFixed(2)} GB total).
Folders: ${folderSummary || "No folders yet"}
File types: ${typeSummary}
${fileContext}

Your job:
- Answer questions about the user's files naturally and helpfully
- When showing file results, reference them by name
- Be concise but informative
- Use Vietnamese when the user writes in Vietnamese, English otherwise
- If the user asks to perform an action (share, download, organize), explain what you found and suggest next steps
- Format your response in a readable way

IMPORTANT: If you reference files from the search results, mention them by their exact names so the UI can link them.`;

  const messages = [
    { role: "user", parts: [{ text: systemPrompt }] },
    ...conversationHistory.slice(-10).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  let reply = "";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: messages }),
      }
    );
    const data = await res.json();
    reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";
  } catch (e) {
    console.error("Gemini chat error:", e);
    reply = "Sorry, AI is temporarily unavailable. Please try again.";
  }

  // Generate presigned URLs for relevant files
  const fileRefs: FileRef[] = await Promise.all(
    relevantFiles.map(async (f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mime_type,
      fileSize: f.file_size,
      url: f.storage_path ? await getPresignedUrl(f.storage_path, 3600) : null,
      thumbnailUrl: f.thumbnail_path ? `${R2_PUBLIC_URL}/${f.thumbnail_path}` : null,
      folderName: f.folder_name || "My Files",
      createdAt: f.created_at,
    }))
  );

  return { reply, files: fileRefs };
}

function formatBytes(b: number): string {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
