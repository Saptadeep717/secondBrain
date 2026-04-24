import { Request, Response } from "express";
import { ContentModel } from "../../db/models";
import { callLLMDirect } from "../../services/ai/llm.provider";
import ApiResponse from "../../utils/ApiResponse";
import { wrapAsync } from "../../utils/AsyncHandler";

interface Suggestion {
  topic: string;
  count: number;
}

interface CategoryGroup {
  category: string;
  topics: Suggestion[];
}

async function categorizeSuggestions(
  suggestions: Suggestion[],
): Promise<CategoryGroup[]> {
  if (suggestions.length === 0) return [];

  const topicList = suggestions
    .map((s, i) => `${i + 1}. ${s.topic} (mentioned ${s.count} times)`)
    .join("\n");

  const prompt = `Group these learning topics into meaningful categories for a personal knowledge dashboard.
Return ONLY a valid JSON array — no markdown, no explanation.

EXAMPLE INPUT:
1. Dijkstra's algorithm implementation (mentioned 2 times)
2. PostgreSQL indexing strategies (mentioned 2 times)
3. Topological sort applications (mentioned 1 time)
4. Connection pooling with PgBouncer (mentioned 1 time)
5. Kafka vs RabbitMQ comparison (mentioned 1 time)
6. Event sourcing patterns (mentioned 1 time)

EXAMPLE OUTPUT:
[
  {
    "category": "Graph Algorithms",
    "topics": ["Dijkstra's algorithm implementation", "Topological sort applications"]
  },
  {
    "category": "Database Engineering",
    "topics": ["PostgreSQL indexing strategies", "Connection pooling with PgBouncer"]
  },
  {
    "category": "Event-Driven Systems",
    "topics": ["Kafka vs RabbitMQ comparison", "Event sourcing patterns"]
  }
]

RULES:
- 2-5 categories maximum
- Category names: 2-4 words, title case, descriptive
- Group by subject area — not by frequency
- Keep ALL topics, don't drop any
- Put the most frequently mentioned topics in their own category if they form a clear group

Now categorize:
${topicList}

Output (JSON array only):`;

  try {
    const raw = await callLLMDirect(prompt);
    const clean = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const arrayMatch = clean.match(/\[[\s\S]*\]/);
    if (!arrayMatch) throw new Error("No JSON array found");

    const parsed = JSON.parse(arrayMatch[0]);
    if (!Array.isArray(parsed)) throw new Error("Not an array");

    const topicCountMap = new Map(
      suggestions.map((s) => [s.topic.toLowerCase(), s.count]),
    );

    return parsed.map((group: any) => ({
      category: group.category || "General",
      topics: (group.topics || []).map((t: string) => ({
        topic: t,
        count: topicCountMap.get(t.toLowerCase()) || 1,
      })),
    }));
  } catch (err: any) {
    console.warn(`[suggestions] Categorization failed: ${err.message}`);
    return [{ category: "Explore Next", topics: suggestions }];
  }
}

export const getSuggestions = wrapAsync(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 15, 30);
  const categorize = req.query.categorize !== "false";

  const contents = await ContentModel.find({
    userId: req.userId!,
    status: "enriched",
    suggestedTopics: { $exists: true, $not: { $size: 0 } },
  })
    .select("suggestedTopics title tags")
    .populate("tags", "name")
    .lean();

  if (contents.length === 0) {
    return res.status(200).json(
      ApiResponse.success("No suggestions yet — save and enrich more content", {
        suggestions: [],
        categories: [],
      }),
    );
  }

  // Count frequency across all saved content
  const topicCount: Record<string, number> = {};
  for (const item of contents) {
    for (const topic of (item as any).suggestedTopics || []) {
      const key = topic.toLowerCase().trim();
      topicCount[key] = (topicCount[key] || 0) + 1;
    }
  }

  const ranked: Suggestion[] = Object.entries(topicCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic, count]) => ({ topic, count }));

  // Knowledge graph suggestions
  const graphDocs = await ContentModel.find({
    userId: req.userId!,
    "relations.0": { $exists: true },
  })
    .select("suggestedTopics")
    .lean();

  const graphTopics = new Set<string>();
  for (const item of graphDocs) {
    for (const topic of (item as any).suggestedTopics || []) {
      graphTopics.add(topic.toLowerCase().trim());
    }
  }

  let categories: CategoryGroup[] = [];
  if (categorize && ranked.length > 0) {
    categories = await categorizeSuggestions(ranked);
  }

  res.status(200).json(
    ApiResponse.success("Suggestions fetched", {
      suggestions: ranked,
      categories,
      graphSuggestions: Array.from(graphTopics).slice(0, 5),
      totalContentAnalyzed: contents.length,
    }),
  );
});
