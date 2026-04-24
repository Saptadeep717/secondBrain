import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

// ─── Embedding provider ───────────────────────────────────────────────────────
//
// CRITICAL: Never mix embedding providers in the same database.
// Vectors from different models are NOT comparable.
//
// If you switch providers:
//   1. Change ACTIVE_PROVIDER below
//   2. Clear all embeddings: db.contents.updateMany({}, { $set: { embedding: [] } })
//   3. Run: npx ts-node src/scripts/reembed.ts
//
// CURRENT:    "openai"  — text-embedding-3-small, 1536d, best quality
// FALLBACK:   "gemini"  — gemini-embedding-001,   3072d, free
//
// ── SWITCH THIS when changing provider ───────────────────────────────────────
const ACTIVE_PROVIDER: "openai" | "gemini" = "openai";
// ─────────────────────────────────────────────────────────────────────────────

const DIMENSIONS = {
  openai: 1536,
  gemini: 3072,
};

export const EMBEDDING_DIMENSIONS = DIMENSIONS[ACTIVE_PROVIDER];

// Threshold for cosine similarity search.
// OpenAI has clean separation — 0.3 works perfectly.
// Gemini has compressed range — needs 0.6.
export const SIMILARITY_THRESHOLD =
  (ACTIVE_PROVIDER as string) === "gemini" ? 0.6 : 0.2;

// ─── Clients ──────────────────────────────────────────────────────────────────

let openaiClient: OpenAI | null = null;
let geminiClient: GoogleGenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

// ─── Provider implementations ─────────────────────────────────────────────────

// PAID — OpenAI text-embedding-3-small — 1536d
// Industry standard, best separation, stable API
async function embedWithOpenAI(text: string): Promise<number[]> {
  const client = getOpenAI();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
    encoding_format: "float",
  });
  return response.data[0]?.embedding ?? [];
}

// FREE fallback — Gemini gemini-embedding-001 — 3072d
// Only used if OpenAI is unavailable
async function embedWithGemini(text: string): Promise<number[]> {
  const client = getGemini();
  const response = await client.models.embedContent({
    model: "gemini-embedding-001",
    contents: text.slice(0, 8000),
  });
  return response.embeddings?.[0]?.values ?? [];
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    console.warn("[embeddings] Empty text — returning zero vector");
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  switch (ACTIVE_PROVIDER) {
    case "openai":
      return embedWithOpenAI(text);
    case "gemini":
      return embedWithGemini(text);
  }
}

export async function generateQueryEmbedding(query: string): Promise<number[]> {
  return generateEmbedding(query);
}
