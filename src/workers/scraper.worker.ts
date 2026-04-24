import { Worker, Job } from "bullmq";
import { ScrapeJobData, EnrichJobData, enrichQueue } from "../queues/queues";
import { bullMQRedisOptions } from "../db/redisConnection";
import { scrapeAndStore } from "../services/scrapperService";
import { publishSSEEvent } from "../services/sseService";
import { ContentRepository } from "../db/repository/content.repo";

const contentRepo = new ContentRepository();

async function processScrapeJob(job: Job<ScrapeJobData>): Promise<void> {
  const { contentId, url, userId, title, manualTags } = job.data;

  console.log(`[scraper-worker] Starting job scrape-${contentId}`);

  await contentRepo.updateScrapedContent(contentId, { status: "scraping" });
  await job.updateProgress(10);

  let rawContentKey: string;
  let contentType: string;
  let scrapeBlocked = false;

  try {
    const result = await scrapeAndStore(contentId, url);
    rawContentKey = result.rawContentKey;
    contentType = result.contentType;
    scrapeBlocked = result.scrapeBlocked;
  } catch (err: any) {
    await contentRepo.updateScrapedContent(contentId, { status: "failed" });
    await publishSSEEvent(userId, {
      type: "content:failed",
      contentId,
      data: { contentId, status: "failed", reason: err.message },
    });
    throw err;
  }

  await job.updateProgress(70);

  await contentRepo.updateScrapedContent(contentId, {
    rawContentKey,
    contentType: contentType as any,
    status: "scraped",
    scrapedSuccessfully: !scrapeBlocked,
  });

  // Pass manualTags through to enrichment worker
  const enrichJobData: EnrichJobData = {
    contentId,
    userId,
    rawContentKey,
    contentType,
    title,
    scrapeBlocked,
    manualTags: manualTags || [],
  };

  await enrichQueue.add(`enrich-${contentId}` as any, enrichJobData, {
    delay: 500,
    jobId: `enrich-${contentId}`,
  });

  await publishSSEEvent(userId, {
    type: "content:scraped",
    contentId,
    data: {
      contentId,
      status: "scraped",
      scrapeBlocked,
      note: scrapeBlocked
        ? "Site blocked scraping — AI will summarise from title"
        : "Scraped successfully",
    },
  });

  await job.updateProgress(100);
  console.log(
    `[scraper-worker] ✅ Done contentId=${contentId} scrapeBlocked=${scrapeBlocked}`,
  );
}

export function startScraperWorker(): Worker<ScrapeJobData> {
  const worker = new Worker<ScrapeJobData>("scrape-queue", processScrapeJob, {
    connection: bullMQRedisOptions,
    concurrency: 3,
    stalledInterval: 30000,
    lockDuration: 60000,
  });

  worker.on("completed", (job) =>
    console.log(`[scraper-worker] ✅ Job ${job.id} completed`),
  );
  worker.on("failed", (job, err) =>
    console.error(
      `[scraper-worker] ❌ Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`,
    ),
  );
  worker.on("stalled", (jobId) =>
    console.warn(`[scraper-worker] ⚠️ Job ${jobId} stalled — requeuing`),
  );

  console.log("🔧 Scraper worker started");
  return worker;
}
