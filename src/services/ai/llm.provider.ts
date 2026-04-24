import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnrichmentResult {
  summary: string;
  tags: string[];
  contentType: string;
  provider: string;
}

// ─── Clients — lazily instantiated ───────────────────────────────────────────

let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;
let groqClient: OpenAI | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY)
      throw new Error("ANTHROPIC_API_KEY not set");
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function getGroq(): OpenAI {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");
    groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return groqClient;
}

function getGemini(): GoogleGenerativeAI {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
}

// ─── Enrichment prompt ────────────────────────────────────────────────────────
// Few-shot examples show the exact output format expected.
// This dramatically reduces malformed JSON and incomplete responses.

function buildEnrichmentPrompt(rawText: string): string {
  return `You are a knowledge management assistant that extracts structured metadata from content.
Analyze the content and return ONLY a valid JSON object — no markdown, no explanation, no code fences.

Required JSON shape:
{
  "summary": "exactly 2 sentences — first sentence states what it is, second states the key insight or takeaway",
  "tags": ["3 to 5 lowercase topic tags — specific, not generic"],
  "contentType": "one of: article | youtube | twitter | tutorial | paper | tool | unknown"
}

EXAMPLES:

Example 1 — Technical article:
Content: "PostgreSQL uses a heap file structure to store table data. Each table is stored in one or more files, with each file being 1GB maximum. Pages within the file are 8KB and contain tuple data..."
Output:
{
  "summary": "This article explains PostgreSQL's internal storage architecture, covering heap files, pages, and tuple layout. The key insight is that understanding storage internals helps diagnose performance issues and design better schemas.",
  "tags": ["postgresql", "database-internals", "storage-engine", "performance"],
  "contentType": "article"
}

Example 2 — YouTube video:
Content: "Title: Linux Commands You Must Know Channel: NetworkChuck. This video covers essential Linux commands for developers and sysadmins..."
Output:
{
  "summary": "NetworkChuck's video covers the most important Linux commands every developer should know for daily workflows. It focuses on practical usage with real-world examples rather than theoretical explanation.",
  "tags": ["linux", "command-line", "devops", "terminal"],
  "contentType": "youtube"
}

Example 3 — Tutorial:
Content: "In this tutorial we'll build a REST API with Node.js and Express. We'll cover routing, middleware, error handling, and connecting to MongoDB..."
Output:
{
  "summary": "A hands-on tutorial for building a production-ready REST API using Node.js, Express, and MongoDB from scratch. Covers the complete stack including routing, middleware, error handling, and database integration.",
  "tags": ["nodejs", "express", "rest-api", "mongodb", "backend"],
  "contentType": "tutorial"
}

Now analyze this content:
${rawText.slice(0, 8000)}`;
}

// ─── Per-provider callers ─────────────────────────────────────────────────────

async function callGroq(prompt: string): Promise<EnrichmentResult> {
  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  return { ...parsed, provider: "groq-llama3.3" };
}

async function callGemini(prompt: string): Promise<EnrichmentResult> {
  const model = getGemini().getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const clean = result.response
    .text()
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  const parsed = JSON.parse(clean);
  return { ...parsed, provider: "gemini-2.5-flash" };
}

async function callGPT(prompt: string): Promise<EnrichmentResult> {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  return { ...parsed, provider: "gpt-4o-mini" };
}

async function callClaude(prompt: string): Promise<EnrichmentResult> {
  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });
  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(text);
  return { ...parsed, provider: "claude" };
}

// ─── Enrichment fallback chain ────────────────────────────────────────────────

export async function enrichWithFallback(
  rawText: string,
): Promise<EnrichmentResult> {
  const prompt = buildEnrichmentPrompt(rawText);

  const providers = [
    { name: "groq-llama3.3", call: () => callGroq(prompt) },
    { name: "gemini-2.5-flash", call: () => callGemini(prompt) },
    { name: "gpt-4o-mini", call: () => callGPT(prompt) },
    { name: "claude", call: () => callClaude(prompt) },
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`[llm] Trying provider: ${provider.name}`);
      const result = await provider.call();

      if (
        !result.summary ||
        !Array.isArray(result.tags) ||
        result.tags.length === 0
      ) {
        throw new Error(`Provider ${provider.name} returned incomplete data`);
      }

      console.log(`[llm] ✅ Provider ${provider.name} succeeded`);
      return result;
    } catch (err: any) {
      console.warn(`[llm] ⚠️ Provider ${provider.name} failed: ${err.message}`);
      errors.push(`${provider.name}: ${err.message}`);
    }
  }

  throw new Error(`All LLM providers failed:\n${errors.join("\n")}`);
}

// ─── Streaming — for RAG chat ─────────────────────────────────────────────────

export async function* streamWithFallback(
  systemPrompt: string,
  userMessage: string,
): AsyncGenerator<string> {
  if (process.env.OPENAI_API_KEY) {
    try {
      const stream = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) yield text;
      }
      return;
    } catch (err: any) {
      console.warn(`[llm] GPT streaming failed: ${err.message} — trying Groq`);
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const stream = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) yield text;
      }
      return;
    } catch (err: any) {
      console.warn(
        `[llm] Groq streaming failed: ${err.message} — trying Gemini`,
      );
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const model = getGemini().getGenerativeModel({
        model: "gemini-2.5-flash",
      });
      const result = await model.generateContent(
        `${systemPrompt}\n\n${userMessage}`,
      );
      yield result.response.text();
      return;
    } catch (err: any) {
      console.warn(`[llm] Gemini failed: ${err.message} — trying Claude`);
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const stream = await getAnthropic().messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          yield chunk.delta.text;
        }
      }
      return;
    } catch (err: any) {
      console.warn(`[llm] Claude failed: ${err.message}`);
    }
  }

  yield "I'm unable to answer right now — all AI providers are unavailable. Please try again.";
}

// ─── Generic direct LLM call ──────────────────────────────────────────────────
// Use for digest, autolink, titles, notifications — anything NOT enrichment.
// Returns raw string — caller parses it.

export async function callLLMDirect(prompt: string): Promise<string> {
  if (process.env.GROQ_API_KEY) {
    try {
      const response = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      console.warn(`[llm-direct] Groq failed: ${err.message}`);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      console.warn(`[llm-direct] GPT failed: ${err.message}`);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const model = getGemini().getGenerativeModel({
        model: "gemini-2.5-flash",
      });
      const result = await model.generateContent(prompt);
      return result.response
        .text()
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
    } catch (err: any) {
      console.warn(`[llm-direct] Gemini failed: ${err.message}`);
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await getAnthropic().messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      return response.content[0]?.type === "text"
        ? response.content[0].text
        : "";
    } catch (err: any) {
      console.warn(`[llm-direct] Claude failed: ${err.message}`);
    }
  }

  throw new Error("All LLM providers failed for direct call");
}
