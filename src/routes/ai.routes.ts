import { Router } from "express";
import { authMiddleware } from "../middlewares/auth-middleware";
import { chatWithBrain } from "../controllers/ai/chat.controller";
import { getDigest } from "../controllers/ai/digest.controller";
import { getSuggestions } from "../controllers/ai/suggestions.controller";

const router = Router();
router.use(authMiddleware);

router.post("/chat", chatWithBrain); // POST /api/v1/ai/chat
router.get("/digest", getDigest); // GET  /api/v1/ai/digest?days=7
router.get("/suggestions", getSuggestions); // GET  /api/v1/ai/suggestions

export default router;
