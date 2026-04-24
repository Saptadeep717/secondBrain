import { Router } from "express";
import { authMiddleware } from "../middlewares/auth-middleware";
import {
  createContent,
  getContents,
  deleteContent,
} from "../controllers/content.controller";
import { searchContent } from "../controllers/ai/search.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", createContent); // POST   /api/v1/content
router.get("/", getContents); // GET    /api/v1/content
router.delete("/:contentId", deleteContent); // DELETE /api/v1/content/:contentId
router.get("/search", searchContent); // GET    /api/v1/content/search?q=

export default router;
