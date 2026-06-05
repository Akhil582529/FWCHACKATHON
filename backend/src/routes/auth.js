import { Router } from "express";
import { register, login, getMe, logout } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { registerRules, loginRules, validate } from "../middleware/validate.js";
import rateLimit from "express-rate-limit";

const router = Router();

// ── Rate limiter: 10 attempts per 15 min per IP ───────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Public routes ─────────────────────────────────────────────────────────────
router.post("/register", authLimiter, registerRules, validate, register);
router.post("/login",    authLimiter, loginRules,    validate, login);

// ── Protected routes ──────────────────────────────────────────────────────────
router.get("/me",     protect, getMe);
router.post("/logout", protect, logout);

export default router;
