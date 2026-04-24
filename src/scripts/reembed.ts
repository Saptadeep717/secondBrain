// src/scripts/reembed.ts
// Run once to fix documents with missing or broken embeddings.
// Usage: npx ts-node src/scripts/reembed.ts

import "dotenv/config";
import { db } from "../db/dbConnection";
import { ContentModel } from "../db/models";
import {
  generateEmbedding,
  EMBEDDING_DIMENSIONS,
} from "../services/ai/embeddings.service";

async function reembed() {
  await db.connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/brainly",
  );
  console.log("✅ Connected to MongoDB");

  // Fetch all enriched docs — populate tags to get name strings
  const allEnriched = await ContentModel.find({ status: "enriched" })
    .populate("tags", "name")
    .lean();

  console.log(`Total enriched documents: ${allEnriched.length}`);

  // Find broken ones — empty or zero vectors
  const broken = allEnriched.filter((doc: any) => {
    const emb = doc.embedding as number[];
    if (!emb || emb.length === 0) return true;
    const mag = Math.sqrt(emb.reduce((s: number, v: number) => s + v * v, 0));
    return mag === 0;
  });

  // Also re-embed ALL docs to use the new richer text format
  // (title + summary + tags combined) — comment out filter above
  // and use allEnriched if you want to force re-embed everything
  const toProcess = broken;

  console.log(`Documents needing re-embed: ${toProcess.length}`);

  if (toProcess.length === 0) {
    console.log("All embeddings look good!");
    console.log("To force re-embed ALL docs with new format run:");
    console.log("  db.contents.updateMany({}, { $set: { embedding: [] } })");
    process.exit(0);
  }

  let success = 0;
  let failed = 0;

  for (const doc of toProcess) {
    const title = (doc as any).title || "";
    const summary = (doc as any).summary || "";

    // Get tag names from populated tags
    const tagNames = ((doc as any).tags || [])
      .map((t: any) => t.name || "")
      .filter(Boolean);

    // Same format as enrichment.worker.ts — title + summary + tags
    const textToEmbed = [
      title,
      summary,
      tagNames.length > 0 ? `Topics: ${tagNames.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    if (!textToEmbed.trim()) {
      console.warn(`⚠️  Skipping — no text to embed`);
      failed++;
      continue;
    }

    try {
      const embedding = await generateEmbedding(textToEmbed);
      const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));

      if (mag === 0) throw new Error("Got zero vector back");

      await ContentModel.updateOne(
        { _id: (doc as any)._id },
        { $set: { embedding } },
      );

      console.log(
        `✅ "${title.slice(0, 45)}" — ${embedding.length}d | tags: [${tagNames.join(", ")}]`,
      );
      success++;

      await new Promise((r) => setTimeout(r, 500));
    } catch (err: any) {
      console.error(`❌ "${title}" — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone — ${success} fixed, ${failed} failed`);
  process.exit(0);
}

reembed().catch((e) => {
  console.error("Script failed:", e.message);
  process.exit(1);
});
