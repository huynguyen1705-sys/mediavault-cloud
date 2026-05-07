import prisma from "@/lib/db";
import { getPresignedUrl } from "@/lib/r2";
import { generateEmbedding } from "@/lib/embeddings";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://cdn.fii.one";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";

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

interface ActionResult {
  type: "search" | "create_collection" | "share" | "move" | "delete" | "stats" | "none";
  message: string;
  data?: any;
}

interface ChatResponse {
  reply: string;
  files: FileRef[];
  action?: ActionResult;
}

// ── Intent detection via keywords ──
function detectIntent(msg: string): string {
  const lower = msg.toLowerCase();
  
  // Stats / info
  if (/bao nhiêu|dung lượng|tổng|thống kê|storage|how many|total|stats|space/i.test(lower)) return "stats";
  
  // Create collection / album
  if (/tạo (album|collection|nhóm|bộ sưu tập)|create (album|collection|group)|nhóm lại|gom/i.test(lower)) return "create_collection";
  
  // Share
  if (/chia sẻ|share|gửi link|tạo link/i.test(lower)) return "share";
  
  // Move / organize
  if (/di chuyển|move|chuyển|organize|sắp xếp|dọn/i.test(lower)) return "move";
  
  // Delete
  if (/xóa|delete|remove|dọn dẹp|cleanup|clean up/i.test(lower)) return "delete";
  
  // Search (default)
  return "search";
}

// ── Get user storage stats ──
async function getStorageStats(userId: string) {
  const [totalFiles, totalSize, typeCounts, folders, recentFiles] = await Promise.all([
    prisma.file.count({ where: { userId, deletedAt: null } }),
    prisma.file.aggregate({ where: { userId, deletedAt: null }, _sum: { fileSize: true } }),
    prisma.$queryRaw<{ type: string; count: string; size: string }[]>`
      SELECT SPLIT_PART(mime_type, '/', 1) as type, 
             COUNT(*)::text as count,
             SUM(file_size)::text as size
      FROM files WHERE user_id = ${userId}::uuid AND deleted_at IS NULL
      GROUP BY SPLIT_PART(mime_type, '/', 1) ORDER BY count DESC
    `,
    prisma.folder.findMany({
      where: { userId },
      select: { id: true, name: true, _count: { select: { files: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.file.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, mimeType: true, fileSize: true, createdAt: true },
    }),
  ]);

  return { totalFiles, totalSize: Number(totalSize._sum.fileSize || 0), typeCounts, folders, recentFiles };
}

// ── Semantic search files ──
async function searchFiles(userId: string, query: string, limit = 8): Promise<any[]> {
  try {
    const embResult = await generateEmbedding(query, { apiKey: OPENROUTER_KEY });
    const embedding = embResult?.embedding;
    if (!embedding) return [];

    return await prisma.$queryRaw<any[]>`
      SELECT f.id, f.name, f.mime_type, f.file_size::text, f.storage_path,
             f.thumbnail_path, f.created_at,
             fo.name as folder_name,
             1 - (fe.embedding <=> ${embedding}::vector) as similarity
      FROM file_embeddings fe
      JOIN files f ON f.id = fe.file_id
      LEFT JOIN folders fo ON fo.id = f.folder_id
      WHERE f.user_id = ${userId}::uuid AND f.deleted_at IS NULL
      ORDER BY fe.embedding <=> ${embedding}::vector
      LIMIT ${limit}
    `;
  } catch (e) {
    console.error("Search error:", e);
    return [];
  }
}

// ── Create collection from search results ──
async function createCollectionFromSearch(userId: string, name: string, fileIds: string[]) {
  const collection = await prisma.collection.create({
    data: {
      userId,
      name,
      type: "manual",
      fileCount: fileIds.length,
      thumbnailMosaic: [],
      isPinned: false,
    },
  });

  if (fileIds.length > 0) {
    await prisma.collectionFile.createMany({
      data: fileIds.map(fileId => ({ collectionId: collection.id, fileId })),
      skipDuplicates: true,
    });

    // Get thumbnails for mosaic
    const thumbFiles = await prisma.file.findMany({
      where: { id: { in: fileIds.slice(0, 4) } },
      select: { thumbnailPath: true },
    });
    const mosaic = thumbFiles
      .filter(f => f.thumbnailPath)
      .map(f => `${R2_PUBLIC_URL}/${f.thumbnailPath}`);

    await prisma.collection.update({
      where: { id: collection.id },
      data: { thumbnailMosaic: mosaic },
    });
  }

  return collection;
}

// ── Create share links ──
async function createShareLinks(userId: string, fileIds: string[]) {
  const results: { fileName: string; shareUrl: string }[] = [];

  for (const fileId of fileIds.slice(0, 5)) {
    const file = await prisma.file.findFirst({
      where: { id: fileId, userId },
      select: { id: true, name: true },
    });
    if (!file) continue;

    // Check existing share
    let share = await prisma.share.findFirst({
      where: { fileId: file.id, userId },
    });

    if (!share) {
      const token = generateToken();
      share = await prisma.share.create({
        data: {
          userId,
          fileId: file.id,
          shareToken: token,
          allowDownload: true,
        },
      });
    }

    results.push({
      fileName: file.name,
      shareUrl: `https://fii.one/s/${share.shareToken}`,
    });
  }

  return results;
}

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 6; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

function formatBytes(b: number): string {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Process a chat message — detect intent, execute action, generate response.
 */
export async function processChat(
  userId: string,
  message: string,
  conversationHistory: { role: string; content: string }[]
): Promise<ChatResponse> {
  const intent = detectIntent(message);
  const stats = await getStorageStats(userId);

  let searchResults: any[] = [];
  let actionResult: ActionResult = { type: "none", message: "" };
  let contextForLLM = "";

  // ── Execute based on intent ──

  if (intent === "stats") {
    const typeBreakdown = stats.typeCounts
      .map(t => `- ${t.type}: ${t.count} files (${formatBytes(Number(t.size))})`)
      .join("\n");
    const folderList = stats.folders.map(f => `- ${f.name}: ${f._count.files} files`).join("\n");

    contextForLLM = `
USER STORAGE STATS:
- Total files: ${stats.totalFiles}
- Total size: ${formatBytes(stats.totalSize)}
- File types:\n${typeBreakdown}
- Folders:\n${folderList || "No folders"}
- Recent uploads: ${stats.recentFiles.map(f => f.name).join(", ")}
    `;
    actionResult = { type: "stats", message: "Stats retrieved" };
  }

  if (intent === "search" || intent === "create_collection" || intent === "share") {
    searchResults = await searchFiles(userId, message);
    const relevant = searchResults.filter((r: any) => r.similarity > 0.25);

    if (relevant.length > 0) {
      contextForLLM = `
SEARCH RESULTS (${relevant.length} files found):
${relevant.map((f: any, i: number) =>
  `${i + 1}. "${f.name}" — ${f.mime_type}, ${formatBytes(Number(f.file_size))}, folder: ${f.folder_name || "My Files"}, match: ${(f.similarity * 100).toFixed(0)}%`
).join("\n")}
      `;
    }

    // Auto-create collection if requested
    if (intent === "create_collection" && relevant.length > 0) {
      const collectionName = message.replace(/tạo (album|collection|nhóm|bộ sưu tập)\s*/i, "").trim() || "AI Collection";
      const collection = await createCollectionFromSearch(userId, collectionName, relevant.map((r: any) => r.id));
      actionResult = {
        type: "create_collection",
        message: `Created collection "${collection.name}" with ${relevant.length} files`,
        data: { collectionId: collection.id, name: collection.name, count: relevant.length },
      };
      contextForLLM += `\n\nACTION COMPLETED: Created collection "${collection.name}" with ${relevant.length} files. User can view it at /collections`;
    }

    // Auto-create share links if requested
    if (intent === "share" && relevant.length > 0) {
      const shareResults = await createShareLinks(userId, relevant.slice(0, 5).map((r: any) => r.id));
      actionResult = {
        type: "share",
        message: `Created ${shareResults.length} share links`,
        data: { links: shareResults },
      };
      contextForLLM += `\n\nACTION COMPLETED: Created share links:\n${shareResults.map(s => `- ${s.fileName}: ${s.shareUrl}`).join("\n")}`;
    }
  }

  // ── Generate LLM response ──
  const systemPrompt = `You are a smart file assistant for fii.one cloud storage.
User storage: ${stats.totalFiles} files, ${formatBytes(stats.totalSize)}.

${contextForLLM}

RULES:
- Reply in Vietnamese if user writes Vietnamese, English otherwise
- Be concise and helpful. Max 3-4 sentences unless user asks for details
- Reference specific file names when available
- If an action was completed, confirm it clearly
- If files were found, briefly describe what was found
- Use **bold** for important info
- Never say "I can help you" — just DO it
- If no files match, say so directly`;

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-10).map(m => ({
      role: m.role as string,
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  let reply = "";
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: chatMessages,
        max_tokens: 1500,
        temperature: 0.5,
      }),
    });
    const data = await res.json();
    reply = data?.choices?.[0]?.message?.content || "Không thể xử lý. Thử lại nhé!";
  } catch (e) {
    console.error("OpenRouter chat error:", e);
    reply = "AI tạm thời không khả dụng. Thử lại sau nhé!";
  }

  // Build file references
  const relevantFiles = searchResults.filter((r: any) => r.similarity > 0.25).slice(0, 6);
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

  return { reply, files: fileRefs, action: actionResult };
}
