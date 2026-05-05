import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { generateEmbedding, buildFileText } from "@/lib/embeddings";

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

    const body = await request.json();
    const { query, limit = 10, threshold = 0.3 } = body;

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

    const searchResults = await prisma.$queryRaw<any[]>`
      SELECT 
        f.id, f.name, f."mimeType", f."fileSize", f."createdAt",
        fe.content_text,
        1 - (fe.embedding <=> ${queryVector}::vector) as similarity
      FROM file_embeddings fe
      JOIN files f ON f.id = fe.file_id
      WHERE f."userId" = ${user.id}::uuid
        AND f."deletedAt" IS NULL
        AND (1 - (fe.embedding <=> ${queryVector}::vector)) > ${threshold}
      ORDER BY fe.embedding <=> ${queryVector}::vector
      LIMIT ${limit}
    `;

    return NextResponse.json({
      success: true,
      query,
      model: result.model,
      results: searchResults.map(r => ({
        id: r.id,
        name: r.name,
        mimeType: r.mimeType,
        fileSize: r.fileSize?.toString(),
        createdAt: r.createdAt,
        similarity: Math.round(r.similarity * 100) / 100,
        contentText: r.content_text,
      })),
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
