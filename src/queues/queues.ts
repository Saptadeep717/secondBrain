import { Queue, QueueOptions } from "bullmq";
import { bullMQRedisOptions } from "../db/redisConnection";

const defaultJobOptions: QueueOptions["defaultJobOptions"] = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
  removeOnComplete: { age: 24 * 3600, count: 100 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

// ─── Job data types ───────────────────────────────────────────────────────────

export interface ScrapeJobData {
  contentId: string;
  url: string;
  userId: string;
  title: string;
  manualTags: string[]; // user-provided tags from POST /content
}

export interface EnrichJobData {
  contentId: string;
  userId: string;
  rawContentKey: string;
  contentType: string;
  title: string;
  scrapeBlocked: boolean;
  manualTags: string[]; // passed through from scrape job
}

// ─── Queue instances ──────────────────────────────────────────────────────────

export const scrapeQueue = new Queue<ScrapeJobData>("scrape-queue", {
  connection: bullMQRedisOptions,
  defaultJobOptions,
});

export const enrichQueue = new Queue<EnrichJobData>("enrich-queue", {
  connection: bullMQRedisOptions,
  defaultJobOptions,
});
