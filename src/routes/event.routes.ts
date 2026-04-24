import { Router } from "express";
import { authMiddleware } from "../middlewares/auth-middleware";
import { connectSSE } from "../controllers/event.controller";

const router = Router();

// Auth required — workers push to userId, so we must know who's connecting.
// The browser EventSource API sends cookies automatically (credentials: true),
// so the httpOnly refreshToken cookie is included on this request.
router.get("/events", authMiddleware, connectSSE);

export default router;