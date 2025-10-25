import { Router } from "express";
import { authMiddleware } from "../middlewares/auth-middleware";
import {
  createContent,
  getContents,
  deleteContent,
} from "../controllers/content.controller";

const router = Router();

// All content routes require authentication
router.use(authMiddleware);

router.post("/", createContent);
router.get("/", getContents);
router.delete("/:contentId", deleteContent);

export default router;
