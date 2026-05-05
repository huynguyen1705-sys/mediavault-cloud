/**
 * AI Embedding Service for Semantic Search
 * Uses OpenRouter API with NVIDIA/OpenAI models
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings";

// Default model (free)
const DEFAULT_MODEL = "nvidia/llama-nemotron-embed-vl-1b-v2";
const DEFAULT_DIMENSION = 1536;

// Fallback models in order
const FALLBACK_MODELS = [
  "nvidia/llama-nemotron-embed-vl-1b-v2",   // Free, multimodal
  "openai/text-embedding-3-small",            // $0.02/1M, reliable
  "baai/bge-m3",                              // Multilingual
];

interface EmbeddingConfig {
  apiKey: string;
  model?: string;
  dimensions?: number;
  fallbackModels?: string[];
}

interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokenCount: number;
}

/**
 * Generate embedding for text using OpenRouter
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<EmbeddingResult> {
  const model = config.model || DEFAULT_MODEL;
  const models = [model, ...(config.fallbackModels || FALLBACK_MODELS.filter(m => m !== model))];
  
  let lastError: Error | null = null;
  
  for (const currentModel of models) {
    try {
      const body: any = {
        model: currentModel,
        input: text.slice(0, 8000), // Limit input length
      };
      
      // Some models support dimensions parameter
      if (config.dimensions && currentModel.includes("openai")) {
        body.dimensions = config.dimensions;
      }
      
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://fii.one",
          "X-Title": "fii.one AI Search",
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const err = await response.text();
        if (response.status === 429) {
          // Rate limited — try next model
          lastError = new Error(`Rate limited on ${currentModel}: ${err}`);
          continue;
        }
        throw new Error(`${currentModel} failed (${response.status}): ${err}`);
      }
      
      const data = await response.json();
      const embedding = data.data?.[0]?.embedding;
      
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error(`Invalid embedding response from ${currentModel}`);
      }
      
      // Truncate/pad to target dimension
      const targetDim = config.dimensions || DEFAULT_DIMENSION;
      const normalized = normalizeVector(embedding, targetDim);
      
      return {
        embedding: normalized,
        model: currentModel,
        tokenCount: data.usage?.prompt_tokens || Math.ceil(text.length / 4),
      };
    } catch (err: any) {
      lastError = err;
      console.error(`Embedding failed with ${currentModel}:`, err.message);
      continue;
    }
  }
  
  throw lastError || new Error("All embedding models failed");
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  config: EmbeddingConfig
): Promise<EmbeddingResult[]> {
  // Process in parallel but with concurrency limit
  const BATCH_SIZE = 10;
  const results: EmbeddingResult[] = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(text => generateEmbedding(text, config))
    );
    
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        // Push zero vector for failed ones
        results.push({
          embedding: new Array(config.dimensions || DEFAULT_DIMENSION).fill(0),
          model: "failed",
          tokenCount: 0,
        });
      }
    }
  }
  
  return results;
}

/**
 * Build text representation of a file for embedding
 */
export function buildFileText(file: {
  name: string;
  mimeType?: string | null;
  metadata?: any;
  tags?: string[];
}): string {
  const parts: string[] = [];
  
  // File name (most important)
  parts.push(`File: ${file.name}`);
  
  // Type
  if (file.mimeType) parts.push(`Type: ${file.mimeType}`);
  
  // Tags
  if (file.tags?.length) parts.push(`Tags: ${file.tags.join(", ")}`);
  
  // Metadata enrichment
  if (file.metadata) {
    const m = file.metadata;
    
    // Camera/photo info
    if (m.camera) parts.push(`Camera: ${m.camera}`);
    if (m.lens) parts.push(`Lens: ${m.lens}`);
    if (m.dateTaken) parts.push(`Date taken: ${m.dateTaken}`);
    
    // Location
    if (m.gps) parts.push(`Location: lat ${m.gps.lat}, lng ${m.gps.lng}`);
    
    // Audio/Music
    if (m.title) parts.push(`Title: ${m.title}`);
    if (m.albumArtist) parts.push(`Artist: ${m.albumArtist}`);
    if (m.album) parts.push(`Album: ${m.album}`);
    if (m.genre) parts.push(`Genre: ${m.genre}`);
    
    // Document
    if (m.documentTitle) parts.push(`Document title: ${m.documentTitle}`);
    if (m.author) parts.push(`Author: ${m.author}`);
    if (m.subject) parts.push(`Subject: ${m.subject}`);
    if (m.keywords?.length) parts.push(`Keywords: ${m.keywords.join(", ")}`);
    
    // Software
    if (m.software) parts.push(`Software: ${m.software}`);
    if (m.artist) parts.push(`Artist: ${m.artist}`);
  }
  
  return parts.join("\n");
}

/**
 * Normalize vector to target dimension (truncate or pad with zeros)
 */
function normalizeVector(vec: number[], targetDim: number): number[] {
  if (vec.length === targetDim) return vec;
  if (vec.length > targetDim) return vec.slice(0, targetDim);
  // Pad with zeros
  return [...vec, ...new Array(targetDim - vec.length).fill(0)];
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
