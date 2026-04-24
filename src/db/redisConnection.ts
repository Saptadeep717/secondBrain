import IORedis from "ioredis";

// One config object — single source of truth for both connections.
// Supports both URL string (for Upstash) and options object (for local Redis)
const connectionConfig: string | any = process.env.REDIS_URL
  ? process.env.REDIS_URL
  : {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null as null, // required by BullMQ
      enableReadyCheck: false,
    };

class RedisClient {
  private static instance: RedisClient;

  // General purpose client — publish, get, set, all normal commands
  private client: IORedis | null = null;

  // Dedicated subscriber — once subscribed, a Redis connection enters
  // a blocking mode and can ONLY receive messages, no other commands.
  // This is a Redis protocol constraint, not a library choice.
  // So we always keep subscriber completely separate from the main client.
  private subscriber: IORedis | null = null;

  private constructor() {}

  public static getInstance(): RedisClient {
    if (!this.instance) {
      this.instance = new RedisClient();
    }
    return this.instance;
  }

  // General purpose connection — use for publish(), get(), set(), etc.
  public getClient(): IORedis {
    if (this.client) return this.client;

    console.log(`🔗 Connecting Redis client to: ${typeof connectionConfig === 'string' ? `Upstash URL : ${process.env.REDIS_URL}` : `${connectionConfig.host}:${connectionConfig.port}`}`);
    this.client = typeof connectionConfig === 'string' 
      ? new IORedis(connectionConfig) 
      : new IORedis(connectionConfig);
    this.client.on("connect", () => console.log("✅ Redis client connected"));
    this.client.on("error", (err) =>
      console.error("❌ Redis client error:", err),
    );

    return this.client;
  }

  // Subscriber connection — use ONLY for subscribe() and on("message").
  // Never call publish(), get(), set() on this connection — it will throw.
  // Lazily created on first call — only the SSE service ever calls this.
  public getSubscriber(): IORedis {
    if (this.subscriber) return this.subscriber;

    console.log(`🔗 Connecting Redis subscriber to: ${typeof connectionConfig === 'string' ? 'Upstash URL' : `${connectionConfig.host}:${connectionConfig.port}`}`);
    // Fresh IORedis instance from the same config — NOT a clone of client.
    // They share config but are completely independent TCP connections.
    this.subscriber = typeof connectionConfig === 'string' 
      ? new IORedis(connectionConfig) 
      : new IORedis(connectionConfig);
    this.subscriber.on("connect", () =>
      console.log("✅ Redis subscriber connected"),
    );
    this.subscriber.on("error", (err) =>
      console.error("❌ Redis subscriber error:", err),
    );

    return this.subscriber;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      console.log("Redis client disconnected.");
    }
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
      console.log("Redis subscriber disconnected.");
    }
  }
}

export const redis = RedisClient.getInstance();

// Plain config object for BullMQ — it creates its own internal ioredis
// instance from this. Passing our IORedis instance directly causes a
// type conflict because BullMQ bundles its own ioredis copy.
export const bullMQRedisOptions = connectionConfig;
