import { Request, Response } from "express";
import { sseService } from "../services/sseService";
import { wrapAsync } from "../utils/AsyncHandler";

const PING_INTERVAL_MS = 30_000;

// GET /api/v1/events
// Opens a persistent SSE stream for the authenticated user.
// Supports multiple simultaneous tabs — each tab gets its own
// Response registered in the SSEService Set for this userId.
//
// Client usage:
//   const es = new EventSource('/api/v1/events', { withCredentials: true });
//   es.addEventListener('content:enriched', (e) => {
//     const { contentId } = JSON.parse(e.data);
//   });

export const connectSSE = wrapAsync(async (req: Request, res: Response) => {
  const userId = req.userId!;

  // SSE required headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // Disable nginx response buffering — without this nginx holds chunks
  // until its buffer fills and the client receives nothing in real time
  res.setHeader("X-Accel-Buffering", "no");

  // Flush immediately so the browser knows the stream is open
  res.flushHeaders();

  // Register this specific tab — adds this Response to the user's Set
  await sseService.register(userId, res);

  // Send initial connected event — lets the client confirm the stream is live
  res.write(
    `event: connected\ndata: ${JSON.stringify({ userId, tabCount: 1 })}\n\n`,
  );

  // Per-tab keepalive ping — 30s interval prevents proxies from closing
  // the idle connection (nginx and AWS ALB default timeout is 60s)
  const pingInterval = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {}\n\n`);
    } catch {
      clearInterval(pingInterval);
    }
  }, PING_INTERVAL_MS);

  // Cleanup when THIS tab closes — unregisters only this Response,
  // other tabs for the same user are untouched
  req.on("close", async () => {
    clearInterval(pingInterval);
    await sseService.unregister(userId, res);
  });
});
