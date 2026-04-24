import { Response } from "express";
import { redis } from "../db/redisConnection";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SSEEventType =
  | "connected"
  | "content:scraped"
  | "content:enriched"
  | "content:failed"
  | "ping";

export interface SSEEvent {
  type: SSEEventType;
  contentId?: string;
  data?: Record<string, unknown>;
}

// Channel naming convention — one channel per user.
// Worker publishes to this, subscriber listens to this.
// Pattern: "sse:userId"
const toChannel = (userId: string) => `sse:${userId}`;

// ─── SSE Service ─────────────────────────────────────────────────────────────

class SSEService {
  private static instance: SSEService;

  // Map<userId, Set<Response>>
  // Set instead of single Response — supports multiple tabs per user.
  // Each tab that calls GET /events gets its own Response added to the Set.
  // Fan-out loops over the whole Set — every tab gets every event.
  private clients: Map<string, Set<Response>> = new Map();

  // Tracks which channels this instance is already subscribed to.
  // Prevents re-subscribing when a second tab opens for the same user.
  private subscribedChannels: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): SSEService {
    if (!this.instance) {
      this.instance = new SSEService();

      // Wire up the Redis subscriber message handler once at startup.
      // All incoming pub/sub messages route through here regardless
      // of which user or how many tabs they have open.
      SSEService.instance.initSubscriber();
    }
    return this.instance;
  }

  // Called once in the constructor — sets up the message handler
  // on the dedicated subscriber connection.
  private initSubscriber(): void {
    const sub = redis.getSubscriber();

    sub.on("message", (channel: string, message: string) => {
      // channel format: "sse:userId123"
      const userId = channel.replace(/^sse:/, "");

      let event: SSEEvent;
      try {
        event = JSON.parse(message);
      } catch {
        console.warn(`[sse] Failed to parse message on channel ${channel}`);
        return;
      }

      // Fan out to every tab this user has open on THIS server instance.
      // Other instances do the same independently with their own Sets.
      this.fanOut(userId, event);
    });

    console.log("[sse] Redis subscriber message handler initialized");
  }

  // ── Public API ────────────────────────────────────────────────────────────

  // Called by events.controller when a client opens GET /events.
  // Adds this tab's Response to the user's Set.
  // Subscribes to the Redis channel if this is the first tab for this user.
  public async register(userId: string, res: Response): Promise<void> {
    // Get or create the Set for this user
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(res);

    const tabCount = this.clients.get(userId)!.size;
    console.log(
      `[sse] Tab registered userId=${userId} (tabs=${tabCount}, totalUsers=${this.clients.size})`,
    );

    // Subscribe to this user's Redis channel only once per server instance.
    // If Tab 1 and Tab 2 are open, we still only need one subscription —
    // the fan-out loop handles delivering to both tabs locally.
    const channel = toChannel(userId);
    if (!this.subscribedChannels.has(channel)) {
      await redis.getSubscriber().subscribe(channel);
      this.subscribedChannels.add(channel);
      console.log(`[sse] Subscribed to Redis channel: ${channel}`);
    }
  }

  // Called by events.controller when a tab disconnects (req.on("close")).
  // Removes just this tab's Response from the Set.
  // Unsubscribes from Redis only when the last tab for this user closes.
  public async unregister(userId: string, res: Response): Promise<void> {
    const tabs = this.clients.get(userId);
    if (!tabs) return;

    tabs.delete(res);
    const tabCount = tabs.size;
    console.log(`[sse] Tab unregistered userId=${userId} (tabs=${tabCount})`);

    // Only unsubscribe from Redis when zero tabs remain for this user.
    // While any tab is open we still need to receive events.
    if (tabCount === 0) {
      this.clients.delete(userId);

      const channel = toChannel(userId);
      await redis.getSubscriber().unsubscribe(channel);
      this.subscribedChannels.delete(channel);
      console.log(
        `[sse] Unsubscribed from Redis channel: ${channel} (no tabs left)`,
      );
    }
  }

  // Called by workers via redis.publish() — NOT called directly.
  // Workers publish to Redis, Redis delivers here, we fan out locally.
  // This method is also exported for the ping keepalive in events.controller.
  public fanOut(userId: string, event: SSEEvent): void {
    const tabs = this.clients.get(userId);
    if (!tabs || tabs.size === 0) return; // no tabs on this instance — no-op

    const deadTabs: Response[] = [];

    for (const res of tabs) {
      try {
        res.write(`event: ${event.type}\n`);
        res.write(`data: ${JSON.stringify(event.data ?? {})}\n\n`);
      } catch {
        // Tab disconnected without firing the close event — mark for cleanup
        deadTabs.push(res);
      }
    }

    // Clean up any dead tabs found during fan-out
    for (const dead of deadTabs) {
      tabs.delete(dead);
      console.warn(`[sse] Removed dead tab for userId=${userId}`);
    }
  }

  // Sends a ping to every connected tab across all users.
  // Called every 30s by the interval in events.controller.
  public pingAll(): void {
    for (const [userId] of this.clients) {
      this.fanOut(userId, { type: "ping", data: {} });
    }
  }

  public get totalConnections(): number {
    let count = 0;
    for (const tabs of this.clients.values()) count += tabs.size;
    return count;
  }
}

export const sseService = SSEService.getInstance();

// ─── Publisher helper ─────────────────────────────────────────────────────────
// Workers call this instead of importing sseService directly.
// Complete decoupling — workers only need Redis, not the SSE service.
// This lives here so the channel naming convention is one place only.
export async function publishSSEEvent(
  userId: string,
  event: SSEEvent,
): Promise<void> {
  await redis.getClient().publish(toChannel(userId), JSON.stringify(event));
}
