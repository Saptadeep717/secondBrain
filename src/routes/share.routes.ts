import { Router } from "express";
import { authMiddleware } from "../middlewares/auth-middleware";
import { toggleShare, getSharedBrain } from "../controllers/share.controller";

const router = Router();

// Auth required for toggling share
router.post("/brain/share", authMiddleware, toggleShare);

// Public access to fetch shared brain
router.get("/brain/:shareLink", getSharedBrain);

export default router;
