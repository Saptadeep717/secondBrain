import { ContentRepository } from "../../db/repository/content.repo";
import { callLLMDirect } from "./llm.provider";

const contentRepo = new ContentRepository();

export interface AutoLinkResult {
  relations: Array<{
    contentId: string;
    relationshipType: "compare" | "extends" | "leads_to" | "same_domain";
    reason: string;
    strength: number;
  }>;
  suggestedTopics: string[];
}

export async function autoLinkContent(
  contentId: string,
  userId: string,
  embedding: number[],
  title: string,
  summary: string,
): Promise<AutoLinkResult> {
  if (!embedding || embedding.length === 0) {
    return { relations: [], suggestedTopics: [] };
  }

  const similar = await contentRepo.searchSimilar(userId, embedding, 8);
  const candidates = similar.filter(
    (item: any) => item._id.toString() !== contentId,
  );

  if (candidates.length === 0) {
    return { relations: [], suggestedTopics: [] };
  }

  const candidateList = candidates
    .map((item: any, i: number) => {
      const tags = item.tags?.map((t: any) => t.name).join(", ") || "";
      return `[${i + 1}] id:${item._id} title:"${item.title}" tags:${tags} summary:"${(item.summary || "").slice(0, 100)}"`;
    })
    .join("\n");

  const prompt = `You are building a knowledge graph for a personal second brain app.
Given a new piece of content and existing saved items, identify meaningful relationships.

Return ONLY a valid JSON object — no markdown, no explanation.

relationshipType guide:
  compare    = both cover the same concept from different angles or implementations
  extends    = new content builds on or goes deeper than the existing item
  leads_to   = reading new content naturally leads to the existing item as a next step
  same_domain = same broad field, different specific topics

EXAMPLE:

New content: title:"Kafka Basics and Core Concepts" summary:"Covers Kafka topics, partitions, consumer groups"
Existing items:
[1] id:abc title:"RabbitMQ Tutorial" tags:messaging,queues summary:"RabbitMQ routing and exchange patterns"
[2] id:def title:"System Design for Uber" tags:system-design,scalability summary:"Microservices and event-driven design"
[3] id:ghi title:"PostgreSQL Deep Dive" tags:postgresql,database summary:"Storage internals and indexing"

Output:
{
  "relations": [
    {
      "contentId": "abc",
      "relationshipType": "compare",
      "reason": "Both cover message brokers — Kafka for streaming, RabbitMQ for task queues",
      "strength": 0.85
    },
    {
      "contentId": "def",
      "relationshipType": "leads_to",
      "reason": "Kafka is a core component of event-driven system design at scale",
      "strength": 0.72
    }
  ],
  "suggestedTopics": ["Kafka vs RabbitMQ latency benchmarks", "Event sourcing with Kafka", "Kafka consumer group rebalancing"]
}

RULES:
- Only include genuinely meaningful relations — omit weak/coincidental connections
- Max 4 relations
- strength: 0.1-1.0 where 1.0 = extremely strong conceptual link
- suggestedTopics: 2-4 specific topics that bridge the new and existing content

Now find relations for:
New content: title:"${title}" summary:"${summary}"
Existing items:
${candidateList}

Output (JSON only):`;

  try {
    const raw = await callLLMDirect(prompt);
    const clean = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error("No JSON object found");

    const parsed = JSON.parse(objMatch[0]);

    const relations = (parsed.relations || []).slice(0, 4).map((r: any) => ({
      contentId: r.contentId,
      relationshipType: r.relationshipType || "same_domain",
      reason: r.reason || "",
      strength: Math.min(1, Math.max(0, r.strength || 0.5)),
    }));

    const suggestedTopics = (parsed.suggestedTopics || []).slice(0, 4);

    return { relations, suggestedTopics };
  } catch (err: any) {
    console.warn(
      `[autolink] Failed for contentId=${contentId}: ${err.message}`,
    );
    return { relations: [], suggestedTopics: [] };
  }
}
