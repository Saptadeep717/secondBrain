import {
  enrichWithFallback,
  callLLMDirect,
  EnrichmentResult,
} from "./llm.provider";
import { fetchRawContent } from "../scrapperService";
import { TagRepository } from "../../db/repository/tag.repo";

const tagRepo = new TagRepository();

export interface EnrichmentOutput {
  summary: string;
  tagIds: string[];
  rawTags: string[];
  contentType: string;
  suggestedTopics: string[];
  provider: string;
  aiGeneratedTitle?: string | undefined;
}

// ─── AI title generation ──────────────────────────────────────────────────────

async function generateAITitle(summary: string): Promise<string | undefined> {
  const prompt = `Generate a clean, descriptive title for this content.

RULES:
- 5-8 words maximum
- No quotes, no punctuation at the end
- Specific and informative — not generic
- Return ONLY the title text, nothing else

EXAMPLES:
Summary: "This article explains how PostgreSQL stores data internally using heap files and pages."
Title: PostgreSQL Internal Storage Architecture Explained

Summary: "A video tutorial covering essential Linux commands for developers working in terminal."
Title: Essential Linux Commands Every Developer Should Know

Summary: "This article covers Kafka's architecture including topics, partitions, and consumer groups."
Title: Apache Kafka Architecture and Core Concepts

Now generate a title for:
Summary: ${summary}
Title:`;

  try {
    const raw = await callLLMDirect(prompt);
    const candidate = raw
      ?.split("\n")[0]
      ?.replace(/^["']|["']$/g, "")
      ?.replace(/^Title:\s*/i, "")
      ?.trim()
      ?.slice(0, 80);
    if (candidate && candidate.length > 5) {
      return candidate;
    }
  } catch {
    // Non-critical
  }
  return undefined;
}

// ─── AI topic suggestions ─────────────────────────────────────────────────────

async function buildSuggestedTopics(
  tags: string[],
  summary: string,
  title: string,
): Promise<string[]> {
  const prompt = `Suggest 4 specific topics this person should explore next based on their saved content.

RULES:
- Be specific and actionable — not generic
- Each suggestion should be a natural next step from this content
- Return ONLY a JSON array of strings

EXAMPLES:

Input: Title: "PostgreSQL Deep Dive", Tags: [postgresql, database, indexing]
Output: ["B-tree vs GIN index selection in PostgreSQL", "EXPLAIN ANALYZE for slow query diagnosis", "Connection pooling with PgBouncer", "PostgreSQL vs MySQL for high-traffic apps"]

Input: Title: "Kafka Basics and Core Concepts", Tags: [kafka, event-streaming, distributed-systems]
Output: ["Kafka Streams API for real-time processing", "Kafka vs RabbitMQ performance comparison", "Event sourcing patterns with Kafka", "Kafka consumer group rebalancing strategies"]

Input: Title: "Graph Algorithms for Coding Interviews", Tags: [algorithms, graphs, dsa]
Output: ["Dijkstra vs Bellman-Ford algorithm selection", "Graph problems on LeetCode by difficulty", "Dynamic programming on trees and graphs", "Topological sort applications in real systems"]

Now suggest topics for:
Title: ${title}
Tags: ${tags.join(", ")}
Summary: ${summary}

Output (JSON array only):`;

  try {
    const raw = await callLLMDirect(prompt);
    const clean = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Extract JSON array — handle cases where LLM adds extra text
    const arrayMatch = clean.match(/\[[\s\S]*\]/);
    if (!arrayMatch) throw new Error("No JSON array found");

    const parsed = JSON.parse(arrayMatch[0]);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .slice(0, 5)
        .map((s: any) => String(s).trim())
        .filter(Boolean);
    }
  } catch (err: any) {
    console.warn(`[enrichment] Topic suggestions failed: ${err.message}`);
  }

  // Mechanical fallback
  return tags.slice(0, 3).map((tag) => `${tag} fundamentals`);
}

// ─── Main enrichment ──────────────────────────────────────────────────────────

export async function enrichContent(
  rawContentKey: string,
  title: string = "",
  scrapeBlocked: boolean = false,
): Promise<EnrichmentOutput> {
  let promptText: string;

  if (scrapeBlocked || !rawContentKey) {
    console.log(
      `[enrichment] Scrape blocked — enriching from title: "${title}"`,
    );
    promptText = `The following content could not be scraped — the site blocks automated access.
Generate a summary based on the title using your knowledge of this topic.

EXAMPLES:

Title: "AWS EC2 Introduction"
Summary output: "Amazon EC2 (Elastic Compute Cloud) is AWS's core virtual machine service that lets you rent scalable computing capacity in the cloud. This article covers instance types, pricing models, and how to launch and configure EC2 instances for different workloads."
Tags output: ["aws", "ec2", "cloud-computing", "infrastructure"]

Title: "React Hooks Complete Guide"
Summary output: "React Hooks are functions that let you use state and lifecycle features in functional components, replacing the need for class components. This guide covers useState, useEffect, useContext, and custom hooks with practical examples."
Tags output: ["react", "hooks", "frontend", "javascript"]

Now generate for:
Title: ${title}`;
  } else {
    const rawText = await fetchRawContent(rawContentKey);

    if (!rawText || rawText.trim().length < 50) {
      console.warn(
        `[enrichment] Raw content too short — falling back to title`,
      );
      promptText = `Title: ${title}\nGenerate a summary of what this content is likely about based on the title.`;
    } else {
      promptText = rawText;
    }
  }

  const result: EnrichmentResult = await enrichWithFallback(promptText);

  const tagDocs = await tagRepo.findOrCreateTags(
    result.tags.map((t) => t.toLowerCase().trim()),
  );
  const tagIds = tagDocs.map((id: any) => id.toString());

  // Run title generation and topic suggestions in parallel
  const [suggestedTopics, aiGeneratedTitle] = await Promise.all([
    buildSuggestedTopics(result.tags, result.summary, title),
    shouldGenerateTitle(title, result.summary)
      ? generateAITitle(result.summary)
      : Promise.resolve(undefined),
  ]);

  if (aiGeneratedTitle) {
    console.log(`[enrichment] AI title: "${aiGeneratedTitle}"`);
  }

  return {
    summary: result.summary,
    tagIds,
    rawTags: result.tags,
    contentType: result.contentType,
    suggestedTopics,
    provider: result.provider,
    aiGeneratedTitle,
  };
}

function shouldGenerateTitle(title: string, summary: string): boolean {
  if (!summary) return false;
  return (
    !title ||
    title.includes("-") ||
    title.includes("_") ||
    title.length < 15 ||
    !title.includes(" ") ||
    [
      "Google Doc",
      "Notion page",
      "YouTube video",
      "Tweet",
      "Saved link",
      "Google Drive file",
      "Figma design",
      "Miro board",
    ].includes(title)
  );
}
