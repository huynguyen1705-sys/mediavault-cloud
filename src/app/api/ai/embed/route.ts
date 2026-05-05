import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { generateEmbedding, buildFileText } from "@/lib/embeddings";

const SYSTEM_API_KEY = process.env.OPENROUTER_API_KEY || "";

/**
 * POST /api/ai/embed
 * Embed a single file or batch of files
 * Body: { fileId?: string, all?: boolean, limit?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { fileId, all, limit = 20 } = body;

    // Get API config
    const aiSettings = await prisma.$queryRaw<any[]>`
      SELECT openrouter_api_key, embedding_model, embedding_dimension, fallback_models, is_enabled
      FROM ai_settings WHERE user_id = ${userId}
    `;
    const settings = aiSettings?.[0];
    const apiKey = settings?.openrouter_api_key || SYSTEM_API_KEY;
    const model = settings?.embedding_model || "nvidia/llama-nemotron-embed-vl-1b-v2";

    if (!apiKey) {
      return NextResponse.json({ error: "No API key. Configure in Settings → AI." }, { status: 400 });
    }

    if (settings && !settings.is_enabled) {
      return NextResponse.json({ error: "AI embeddings disabled" }, { status: 400 });
    }

    let filesToEmbed: any[];

    if (fileId) {
      // Single file
      const file = await prisma.file.findFirst({
        where: { id: fileId, userId: user.id, deletedAt: null },
        select: { id: true, name: true, mimeType: true, metadata: true },
      });
      if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });
      filesToEmbed = [file];
    } else if (all) {
      // Batch: find files without embeddings
      filesToEmbed = await prisma.$queryRawUnsafe<any[]>(`
        SELECT f.id, f.name, f.mime_type as "mimeType", f.metadata
        FROM files f
        LEFT JOIN file_embeddings fe ON fe.file_id = f.id
        WHERE f.user_id = $1::uuid
          AND f.deleted_at IS NULL
          AND fe.id IS NULL
        ORDER BY f.created_at DESC
        LIMIT $2
      `, user.id, limit);
    } else {
      return NextResponse.json({ error: "Provide fileId or all:true" }, { status: 400 });
    }

    let embedded = 0;
    let failed = 0;
    const results: { name: string; status: string }[] = [];

    for (const file of filesToEmbed) {
      try {
        const text = buildFileText({
          name: file.name,
          mimeType: file.mimeType,
          metadata: file.metadata,
        });

        const embResult = await generateEmbedding(text, {
          apiKey,
          model,
          dimensions: settings?.embedding_dimension || 1536,
          fallbackModels: settings?.fallback_models || undefined,
        });

        const vecStr = `[${embResult.embedding.join(",")}]`;

        // Upsert embedding
        await prisma.$executeRawUnsafe(`
          INSERT INTO file_embeddings (id, file_id, embedding, content_text, model_used, token_count)
          VALUES (gen_random_uuid(), $1::uuid, $2::vector, $3, $4, $5)
          ON CONFLICT (file_id) DO UPDATE SET
            embedding = EXCLUDED.embedding,
            content_text = EXCLUDED.content_text,
            model_used = EXCLUDED.model_used,
            token_count = EXCLUDED.token_count,
            updated_at = NOW()
        `, file.id, vecStr, text, embResult.model, embResult.tokenCount);

        embedded++;
        results.push({ name: file.name, status: "ok" });
      } catch (err: any) {
        failed++;
        results.push({ name: file.name, status: `error: ${err.message?.slice(0, 80)}` });
      }
    }

    // Count remaining un-embedded files
    const remaining = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM files f
      LEFT JOIN file_embeddings fe ON fe.file_id = f.id
      WHERE f.user_id = $1::uuid AND f.deleted_at IS NULL AND fe.id IS NULL
    `, user.id);

    return NextResponse.json({
      success: true,
      embedded,
      failed,
      remaining: Number(remaining?.[0]?.count || 0),
      results,
    });
  } catch (error: any) {
    console.error("AI embed error:", error);
    return NextResponse.json({ error: error.message || "Embedding failed" }, { status: 500 });
  }
}
