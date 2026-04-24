import { Router } from "express";
import {
  signup,
  login,
  refresh,
  logout,
  logoutAll,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth-middleware";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);

// Uses the httpOnly cookie — no body needed
router.post("/refresh", refresh);

// Clears the cookie and removes the token from DB
router.post("/logout", logout);

// Requires a valid access token — wipes all sessions for this user
router.post("/logout-all", authMiddleware, logoutAll);

export default router;
