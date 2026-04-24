import { Worker, Job } from "bullmq";
import { EnrichJobData } from "../queues/queues";
import { bullMQRedisOptions } from "../db/redisConnection";
import { ContentRepository } from "../db/repository/content.repo";
import { publishSSEEvent } from "../services/sseService";
import { enrichContent } from "../services/ai/enrichment.service";
import { generateEmbedding } from "../services/ai/embeddings.service";
import { autoLinkContent } from "../services/ai/autolink.service";

const contentRepo = new ContentRepository();

async function processEnrichJob(job: Job<EnrichJobData>): Promise<void> {
  const { contentId, userId, rawContentKey, title, scrapeBlocked, manualTags } =
    job.data;

  console.log(
    `[enrichment-worker] Starting job enrich-${contentId} scrapeBlocked=${scrapeBlocked}`,
  );

  try {
    // ── Step 1: Enrichment ────────────────────────────────────────────────
    await job.updateProgress(10);
    const enriched = await enrichContent(rawContentKey, title, scrapeBlocked);
    console.log(`[enrichment-worker] Enrichment done via ${enriched.provider}`);

    // ── Step 2: Embedding ─────────────────────────────────────────────────
    // Combine ALL semantic signals for the richest possible vector:
    //   1. AI-generated title (most descriptive)
    //   2. Original title
    //   3. AI summary
    //   4. AI-extracted tags (what the LLM thinks it's about)
    //   5. Manual tags (what the USER says it's about — strongest signal)
    await job.updateProgress(35);

    const allTags = [...enriched.rawTags, ...(manualTags || [])].filter(
      Boolean,
    );

    // Deduplicate tags
    const uniqueTags = [...new Set(allTags.map((t) => t.toLowerCase().trim()))];

    const textToEmbed = [
      enriched.aiGeneratedTitle || title,
      enriched.summary,
      uniqueTags.length > 0 ? `Topics: ${uniqueTags.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    console.log(
      `[enrichment-worker] Embedding text: "${textToEmbed.slice(0, 100)}..."`,
    );

    let embedding: number[] = [];
    try {
      embedding = await generateEmbedding(textToEmbed);
    } catch (embErr: any) {
      console.error(
        `[enrichment-worker] ⚠️ Embedding failed contentId=${contentId}: ${embErr.message}`,
      );
      // Don't continue with empty embedding — let BullMQ retry
      throw embErr;
    }

    // ── Step 3: Auto-linking ──────────────────────────────────────────────
    await job.updateProgress(60);
    let relations: any[] = [];
    let autoLinkTopics: string[] = [];

    if (embedding.length > 0) {
      try {
        const contentDoc = await contentRepo.getContentById(contentId);
        const docTitle =
          enriched.aiGeneratedTitle || contentDoc?.title || title;
        const { relations: links, suggestedTopics } = await autoLinkContent(
          contentId,
          userId,
          embedding,
          docTitle,
          enriched.summary,
        );
        relations = links;
        autoLinkTopics = suggestedTopics;
      } catch (linkErr: any) {
        console.warn(
          `[enrichment-worker] ⚠️ Auto-link failed: ${linkErr.message}`,
        );
      }
    }

    // ── Step 4: Persist ───────────────────────────────────────────────────
    await job.updateProgress(80);

    const allSuggestedTopics = [
      ...new Set([...enriched.suggestedTopics, ...autoLinkTopics]),
    ].slice(0, 8);

    const updateData: any = {
      summary: enriched.summary,
      tags: enriched.tagIds,
      contentType: enriched.contentType,
      embedding,
      suggestedTopics: allSuggestedTopics,
      status: "enriched",
      scrapedSuccessfully: !scrapeBlocked,
    };

    if (enriched.aiGeneratedTitle) {
      updateData.title = enriched.aiGeneratedTitle;
    }

    await contentRepo.updateScrapedContent(contentId, updateData);

    if (relations.length > 0) {
      await contentRepo.addRelations(contentId, relations);
    }

    // ── Step 5: SSE push ──────────────────────────────────────────────────
    await job.updateProgress(95);

    await publishSSEEvent(userId, {
      type: "content:enriched",
      contentId,
      data: {
        contentId,
        status: "enriched",
        summary: enriched.summary,
        tags: enriched.tagIds,
        contentType: enriched.contentType,
        suggestedTopics: allSuggestedTopics,
        relationsFound: relations.length,
        provider: enriched.provider,
        scrapeBlocked,
        title: enriched.aiGeneratedTitle || title,
      },
    });

    await job.updateProgress(100);
    console.log(
      `[enrichment-worker] ✅ Done contentId=${contentId} ` +
        `provider=${enriched.provider} tags=[${uniqueTags.join(", ")}]`,
    );
  } catch (err: any) {
    console.error(`[enrichment-worker] ❌ Job failed: ${err.message}`);

    await contentRepo
      .updateScrapedContent(contentId, { status: "failed" })
      .catch(() => {});

    await publishSSEEvent(userId, {
      type: "content:failed",
      contentId,
      data: { contentId, status: "failed", reason: err.message },
    }).catch(() => {});

    throw err;
  }
}

export function startEnrichmentWorker(): Worker<EnrichJobData> {
  const worker = new Worker<EnrichJobData>("enrich-queue", processEnrichJob, {
    connection: bullMQRedisOptions,
    concurrency: 2,
    stalledInterval: 60000,
    lockDuration: 120000,
  });

  worker.on("completed", (job) =>
    console.log(`[enrichment-worker] ✅ Job ${job.id} completed`),
  );
  worker.on("failed", (job, err) =>
    console.error(
      `[enrichment-worker] ❌ Job ${job?.id} failed ` +
        `(attempt ${job?.attemptsMade}/${job?.opts.attempts}): ${err.message}`,
    ),
  );
  worker.on("stalled", (jobId) =>
    console.warn(`[enrichment-worker] ⚠️ Job ${jobId} stalled — requeuing`),
  );

  console.log("🔧 Enrichment worker started");
  return worker;
}
