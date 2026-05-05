import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

/**
 * GET /api/ai/settings
 * Get current AI settings for authenticated user
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.$queryRaw<any[]>`
      SELECT 
        openrouter_api_key,
        embedding_model,
        embedding_dimension,
        fallback_models,
        max_embedding_cost_usd,
        is_enabled,
        created_at,
        updated_at
      FROM ai_settings WHERE user_id = ${userId}
    `;

    if (!settings || settings.length === 0) {
      // Return defaults
      return NextResponse.json({
        openrouterApiKey: null,
        embeddingModel: "nvidia/llama-nemotron-embed-vl-1b-v2",
        embeddingDimension: 1536,
        fallbackModels: [
          "openai/text-embedding-3-small",
          "baai/bge-m3",
        ],
        maxEmbeddingCostUsd: 10.00,
        isEnabled: true,
        isConfigured: false,
      });
    }

    const s = settings[0];
    return NextResponse.json({
      openrouterApiKey: s.openrouter_api_key ? "sk-or-v1-..." + s.openrouter_api_key.slice(-6) : null,
      embeddingModel: s.embedding_model,
      embeddingDimension: s.embedding_dimension,
      fallbackModels: s.fallback_models || [],
      maxEmbeddingCostUsd: Number(s.max_embedding_cost_usd),
      isEnabled: s.is_enabled,
      isConfigured: true,
    });
  } catch (error: any) {
    console.error("AI settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

/**
 * PUT /api/ai/settings
 * Update AI settings (admin only for system-wide, or per-user)
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      openrouterApiKey,
      embeddingModel,
      embeddingDimension,
      fallbackModels,
      maxEmbeddingCostUsd,
      isEnabled,
    } = body;

    // Validate model name
    const validModels = [
      "nvidia/llama-nemotron-embed-vl-1b-v2",
      "openai/text-embedding-3-small",
      "openai/text-embedding-3-large",
      "qwen/qwen3-embedding-8b",
      "qwen/qwen3-embedding-4b",
      "baai/bge-m3",
      "google/gemini-embedding-001",
      "google/gemini-embedding-2-preview",
      "perplexity/pplx-embed-v1-0.6b",
      "sentence-transformers/all-MiniLM-L6-v2",
    ];

    if (embeddingModel && !validModels.includes(embeddingModel)) {
      return NextResponse.json(
        { error: `Invalid model. Valid: ${validModels.join(", ")}` },
        { status: 400 }
      );
    }

    // Upsert settings
    await prisma.$executeRaw`
      INSERT INTO ai_settings (id, user_id, openrouter_api_key, embedding_model, embedding_dimension, fallback_models, max_embedding_cost_usd, is_enabled)
      VALUES (gen_random_uuid(), ${userId}, ${openrouterApiKey || null}, ${embeddingModel || "nvidia/llama-nemotron-embed-vl-1b-v2"}, ${embeddingDimension || 1536}, ${fallbackModels || null}::text[], ${maxEmbeddingCostUsd || 10.00}, ${isEnabled !== false})
      ON CONFLICT (user_id) DO UPDATE SET
        openrouter_api_key = COALESCE(EXCLUDED.openrouter_api_key, ai_settings.openrouter_api_key),
        embedding_model = EXCLUDED.embedding_model,
        embedding_dimension = EXCLUDED.embedding_dimension,
        fallback_models = COALESCE(EXCLUDED.fallback_models, ai_settings.fallback_models),
        max_embedding_cost_usd = EXCLUDED.max_embedding_cost_usd,
        is_enabled = EXCLUDED.is_enabled
    `;

    return NextResponse.json({ success: true, message: "AI settings updated" });
  } catch (error: any) {
    console.error("AI settings PUT error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

/**
 * POST /api/ai/settings/test
 * Test OpenRouter API key connectivity
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, model } = body;

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 400 });
    }

    // Test with a simple embedding
    const testResponse = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://fii.one",
        "X-Title": "fii.one AI Test",
      },
      body: JSON.stringify({
        model: model || "nvidia/llama-nemotron-embed-vl-1b-v2",
        input: "test connection",
      }),
    });

    if (!testResponse.ok) {
      const err = await testResponse.text();
      return NextResponse.json(
        { success: false, error: `API error (${testResponse.status}): ${err.slice(0, 200)}` },
        { status: 200 }
      );
    }

    const data = await testResponse.json();
    const dims = data.data?.[0]?.embedding?.length || 0;

    return NextResponse.json({
      success: true,
      model: model || "nvidia/llama-nemotron-embed-vl-1b-v2",
      dimensions: dims,
      message: `Connected! Model returns ${dims}-dimension vectors.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 200 }
    );
  }
}
