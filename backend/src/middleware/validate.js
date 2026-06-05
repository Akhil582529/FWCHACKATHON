import { body, validationResult } from "express-validator";

// ── Reusable handler ──────────────────────────────────────────────────────────
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Register rules ────────────────────────────────────────────────────────────
export const registerRules = [
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain a number"),
  body("role")
    .isIn(["candidate", "hr", "admin"])
    .withMessage("Role must be candidate, hr, or admin"),
  // HR
  body("companyId")
    .if(body("role").equals("hr"))
    .notEmpty().withMessage("Company ID is required for HR"),
  // Admin
  body("adminKey")
    .if(body("role").equals("admin"))
    .notEmpty().withMessage("Admin key is required for admin registration"),
  // Candidate / HR
  body("fullName")
    .if(body("role").isIn(["candidate", "hr"]))
    .notEmpty().withMessage("Full name is required"),
];

// ── Login rules ───────────────────────────────────────────────────────────────
export const loginRules = [
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  body("role")
    .isIn(["candidate", "hr", "admin"])
    .withMessage("Role must be candidate, hr, or admin"),
];
