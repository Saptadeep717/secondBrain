import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { db } from "./db/dbConnection";
import { redis } from "./db/redisConnection";
import routes from "./routes";
import errorHandler from "./middlewares/errorHandler";
import { startScraperWorker } from "./workers/scraper.worker";
import { startEnrichmentWorker } from "./workers/enrichment.worker";
import { startNotificationWorker } from "./workers/notification.worker";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:8080",
    credentials: true,
  }),
);
app.use(routes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  console.log("📡 Connecting to MongoDB...");
  await db.connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/brainly",
  );

  // Warm up Redis client connection on boot
  redis.getClient();

  // BullMQ workers — poll their queues immediately
  startScraperWorker();
  startEnrichmentWorker();

  // Cron-based notification worker — runs weekly digest every Sunday 9am UTC
  startNotificationWorker();

  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();
