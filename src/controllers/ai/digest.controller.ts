import { Request, Response } from "express";
import { ContentModel } from "../../db/models";
import { callLLMDirect } from "../../services/ai/llm.provider";
import ApiResponse from "../../utils/ApiResponse";
import { wrapAsync } from "../../utils/AsyncHandler";

async function generateDigest(
  contentList: string,
  count: number,
  days: number,
): Promise<string> {
  const prompt = `You are a personal knowledge assistant writing a weekly brain digest.
The user saved ${count} items in the last ${days} days. Analyse their learning patterns and write a digest.

Return ONLY a valid JSON object — no markdown, no explanation.

EXAMPLE INPUT:
- "PostgreSQL Deep Dive" [database, postgresql]: Covers PostgreSQL internals including heap storage and indexing strategies.
- "Kafka Basics" [kafka, event-streaming]: Explains Kafka topics, partitions, and consumer groups for event-driven systems.
- "System Design for Uber" [system-design, scalability]: Discusses designing ride-hailing systems at scale with microservices.

EXAMPLE OUTPUT:
{
  "headline": "This week you explored the infrastructure layer — from database internals to event streaming and distributed system design",
  "themes": [
    { "topic": "Database Engineering", "count": 1, "insight": "Deep focus on PostgreSQL internals suggests you're optimizing a data-heavy system" },
    { "topic": "Distributed Systems", "count": 2, "insight": "Kafka and system design together signal you're building for scale" }
  ],
  "highlight": "The Kafka article was the most actionable save — it directly connects your event-streaming and system design interests",
  "suggestion": "Explore PostgreSQL partitioning next — it bridges your database and scalability interests perfectly"
}

RULES:
- Max 3 themes — group related items together
- headline: one vivid sentence capturing the week's learning arc
- insight: one sentence per theme explaining WHY this pattern matters
- highlight: pick the single most impactful save and explain the connection
- suggestion: one very specific next topic (not generic like "learn more databases")
- Be personal — reference actual titles, not generic summaries

Now write the digest for:
${contentList}

Output (JSON only):`;

  return callLLMDirect(prompt);
}

export const getDigest = wrapAsync(async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string) || 7, 30);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const contents = await ContentModel.find({
    userId: req.userId!,
    status: "enriched",
    createdAt: { $gte: since },
  })
    .populate("tags", "name")
    .lean();

  if (contents.length === 0) {
    return res.status(200).json(
      ApiResponse.success("No content saved in this period", {
        digest: null,
        count: 0,
        days,
      }),
    );
  }

  const contentList = contents
    .map((item: any) => {
      const tags = item.tags?.map((t: any) => t.name).join(", ") || "untagged";
      return `- "${item.title}" [${tags}]: ${item.summary || "no summary"}`;
    })
    .join("\n");

  try {
    const raw = await generateDigest(contentList, contents.length, days);
    const clean = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Extract JSON object safely
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error("No JSON object in response");

    const digest = JSON.parse(objMatch[0]);

    res.status(200).json(
      ApiResponse.success("Digest generated", {
        digest,
        count: contents.length,
        days,
        period: { from: since, to: new Date() },
      }),
    );
  } catch (err: any) {
    console.error(`[digest] Failed: ${err.message}`);
    res.status(200).json(
      ApiResponse.success("Digest (stats only — AI unavailable)", {
        digest: {
          headline: `You saved ${contents.length} items in the last ${days} days`,
          themes: [],
          highlight: (contents[0] as any)?.title || "",
          suggestion: "Check your saved content for patterns",
        },
        count: contents.length,
        days,
        fallback: true,
      }),
    );
  }
});
