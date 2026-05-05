import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { generateEmbedding } from "@/lib/embeddings";

const SYSTEM_API_KEY = process.env.OPENROUTER_API_KEY || "";

/**
 * POST /api/ai/search
 * Semantic search: embed query → find similar files via pgvector
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    const body = await request.json();
    const { query, limit = 30, threshold = 0.03 } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get user's AI settings (or use system defaults)
    const aiSettings = await prisma.$queryRaw<any[]>`
      SELECT openrouter_api_key, embedding_model, embedding_dimension, fallback_models
      FROM ai_settings WHERE user_id = ${userId}
    `;
    
    const settings = aiSettings?.[0];
    const apiKey = settings?.openrouter_api_key || SYSTEM_API_KEY;
    const model = settings?.embedding_model || "nvidia/llama-nemotron-embed-vl-1b-v2";
    const dimension = settings?.embedding_dimension || 1536;

    if (!apiKey) {
      return NextResponse.json({ error: "No API key configured. Set up in Settings → AI." }, { status: 400 });
    }

    // Generate embedding for query
    const result = await generateEmbedding(query, {
      apiKey,
      model,
      dimensions: dimension,
      fallbackModels: settings?.fallback_models || undefined,
    });

    const queryVector = `[${result.embedding.join(",")}]`;

    // Search using pgvector cosine similarity
    // Only search files owned by this user
    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hybrid search: vector similarity + keyword scoring
    const keywords = query.trim().toLowerCase().split(/\s+/).filter((w: string) => w.length > 1);
    // Build keyword LIKE conditions for each word (OR logic)
    const kwLikeConditions = keywords.map((_, i) => 
      `(LOWER(f.name) LIKE $${i + 5} OR (fe.content_text IS NOT NULL AND LOWER(fe.content_text) LIKE $${i + 5}))`
    ).join(' OR ') || 'FALSE';
    const kwScoreExpression = keywords.map((_, i) =>
      `(CASE WHEN LOWER(f.name) LIKE $${i + 5} THEN 0.15 ELSE 0 END + CASE WHEN fe.content_text IS NOT NULL AND LOWER(fe.content_text) LIKE $${i + 5} THEN 0.1 ELSE 0 END)`
    ).join(' + ') || '0';

    const searchResults = await prisma.$queryRawUnsafe<any[]>(`
      WITH semantic AS (
        SELECT 
          fe.file_id,
          fe.content_text,
          1 - (fe.embedding <=> $1::vector) as sem_score
        FROM file_embeddings fe
        JOIN files f ON f.id = fe.file_id
        WHERE f.user_id = $2::uuid AND f.deleted_at IS NULL
        ORDER BY fe.embedding <=> $1::vector
        LIMIT 50
      ),
      keyword AS (
        SELECT f.id as file_id, 
          ${kwScoreExpression} as kw_score
        FROM files f
        LEFT JOIN file_embeddings fe ON fe.file_id = f.id
        WHERE f.user_id = $2::uuid AND f.deleted_at IS NULL
          AND (${kwLikeConditions})
      )
      SELECT 
        f.id, f.name, f.mime_type as "mimeType", f.file_size as "fileSize", 
        f.created_at as "createdAt", f.storage_path as "storagePath",
        f.thumbnail_path as "thumbnailPath",
        s.content_text, s.sem_score,
        COALESCE(k.kw_score, 0) as kw_score,
        (s.sem_score * 0.7 + COALESCE(k.kw_score, 0) * 0.3) as final_score
      FROM semantic s
      JOIN files f ON f.id = s.file_id
      LEFT JOIN keyword k ON k.file_id = s.file_id
      WHERE s.sem_score > $3 OR COALESCE(k.kw_score, 0) > 0
      ORDER BY (s.sem_score * 0.7 + COALESCE(k.kw_score, 0) * 0.3) DESC
      LIMIT $4
    `, queryVector, user.id, threshold, limit, ...keywords.map(w => `%${w}%`));

    // Extract AI snippet from content_text
    const extractSnippet = (contentText: string | null): string | null => {
      if (!contentText) return null;
      const contentLine = contentText.split("\n").find((l: string) => l.startsWith("Content:"));
      if (contentLine) return contentLine.slice(9).trim().slice(0, 120);
      const descLine = contentText.split("\n").find((l: string) => l.startsWith("Description:"));
      if (descLine) return descLine.slice(12).trim().slice(0, 80);
      return null;
    };

    return NextResponse.json({
      success: true,
      query,
      model: result.model,
      timing: Date.now() - startTime,
      results: searchResults.map((r: any) => {
        const cdnBase = process.env.R2_PUBLIC_URL || 'https://cdn.fii.one';
        return {
          id: r.id,
          name: r.name,
          mimeType: r.mimeType,
          fileSize: r.fileSize?.toString(),
          createdAt: r.createdAt,
          score: Math.round(Number(r.final_score) * 100),
          semanticScore: Math.round(Number(r.sem_score) * 100),
          keywordScore: Math.round(Number(r.kw_score) * 100),
          snippet: extractSnippet(r.content_text),
          type: r.mimeType?.split('/')[0] || 'file',
          thumbnailUrl: r.thumbnailPath ? `${cdnBase}/${r.thumbnailPath}` : null,
        };
      }),
      count: searchResults.length,
    });
  } catch (error: any) {
    console.error("AI search error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
