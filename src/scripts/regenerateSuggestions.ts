import "dotenv/config";
import { db } from "../db/dbConnection";
import { ContentModel } from "../db/models";
import { callLLMDirect } from "../services/ai/llm.provider";

async function regenerateSuggestions() {
  await db.connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/brainly",
  );
  console.log("✅ Connected to MongoDB");

  const docs = await ContentModel.find({ status: "enriched" })
    .populate("tags", "name")
    .lean();

  console.log(`Found ${docs.length} documents to update`);

  let success = 0;
  let failed = 0;

  for (const doc of docs) {
    const title = (doc as any).title || "";
    const summary = (doc as any).summary || "";
    const tags = ((doc as any).tags || [])
      .map((t: any) => t.name || "")
      .filter(Boolean);

    if (!summary && !title) {
      console.warn(`⚠️  Skipping — no content`);
      failed++;
      continue;
    }

    const prompt = `Based on this saved content, suggest 3-4 specific topics the person should explore next.
Be concrete and actionable — not generic like "deep dive" or "vs".

Title: ${title}
Summary: ${summary}
Tags: ${tags.join(", ")}

Return ONLY a JSON array of strings — no markdown, no explanation.
Good example: ["PostgreSQL indexing strategies", "EXPLAIN ANALYZE for query tuning", "connection pooling with PgBouncer"]
Bad example: ["postgres deep dive", "database vs postgres"]`;

    try {
      const raw = await callLLMDirect(prompt);
      const clean = raw
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      let suggestions = JSON.parse(clean);
      if (!Array.isArray(suggestions) && suggestions.suggestions) {
        suggestions = suggestions.suggestions;
      }

      if (!Array.isArray(suggestions)) throw new Error("Not an array");

      const cleaned = suggestions
        .slice(0, 5)
        .map((s: any) => String(s).trim())
        .filter(Boolean);

      await ContentModel.updateOne(
        { _id: (doc as any)._id },
        { $set: { suggestedTopics: cleaned } },
      );

      console.log(`✅ "${title.slice(0, 40)}" → [${cleaned.join(", ")}]`);
      success++;

      // Delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err: any) {
      console.error(`❌ "${title}" — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone — ${success} updated, ${failed} failed`);
  process.exit(0);
}

regenerateSuggestions().catch((e) => {
  console.error("Script failed:", e.message);
  process.exit(1);
});
