import { Router } from "express";
import { authMiddleware } from "../middlewares/auth-middleware";
import { toggleShare, getSharedBrain } from "../controllers/share.controller";

const router = Router();

// Auth required — only the owner can toggle their share link
router.post("/brain/share", authMiddleware, toggleShare); // POST /api/v1/brain/share

// Public — anyone with the hash can read the shared brain
router.get("/brain/:shareLink", getSharedBrain); // GET  /api/v1/brain/:shareLink

export default router;