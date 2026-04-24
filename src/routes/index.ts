import { Router } from "express";
import authRoutes from "./auth.routes";
import contentRoutes from "./content.routes";
import shareRoutes from "./share.routes";
import eventsRoutes from "./event.routes";
import aiRoutes from "./ai.routes";

const router = Router();
const apiV1 = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
// POST /api/v1/signup
// POST /api/v1/login
// POST /api/v1/refresh
// POST /api/v1/logout
// POST /api/v1/logout-all
apiV1.use(authRoutes);

// ─── Content ──────────────────────────────────────────────────────────────────
// POST   /api/v1/content
// GET    /api/v1/content
// DELETE /api/v1/content/:contentId
// GET    /api/v1/content/search?q=   (Phase 6)
apiV1.use("/content", contentRoutes);

// ─── Share ────────────────────────────────────────────────────────────────────
// POST /api/v1/brain/share
// GET  /api/v1/brain/:shareLink
apiV1.use(shareRoutes);

// ─── SSE ──────────────────────────────────────────────────────────────────────
// GET /api/v1/events
apiV1.use(eventsRoutes);

// ─── AI ───────────────────────────────────────────────────────────────────────
// POST /api/v1/ai/chat          (Phase 6)
// GET  /api/v1/ai/digest        (Phase 7)
// GET  /api/v1/ai/suggestions   (Phase 7)
apiV1.use("/ai", aiRoutes);

router.use("/api/v1", apiV1);

export default router;
