import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken } from "../config/jwt.js";

// ── POST /api/auth/register ───────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { email, password, role, fullName, companyId, department, adminKey, skills } = req.body;

    // Check duplicate
    const existing = await User.findOne({ email, role });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `An account with this email already exists for the ${role} portal`,
      });
    }

    // Build user document
    const userData = {
      email,
      passwordHash: password,   // pre-save hook will hash it
      role,
    };

    if (role === "candidate") {
      userData.fullName = fullName || null;
      userData.skills = Array.isArray(skills) ? skills : [];
    }

    if (role === "hr") {
      userData.fullName = fullName || null;
      userData.companyId = companyId;
      userData.department = department || null;
    }

    if (role === "admin") {
      // Hash admin key separately
      userData.adminKeyHash = await bcrypt.hash(adminKey, 12);
      userData.permissions = ["manage_users", "manage_jobs", "view_analytics"];
    }

    const user = await User.create(userData);

    const token = signToken({ id: user._id, role: user.role });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: user.profile,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: "Server error during registration" });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password, role, companyId, adminKey } = req.body;

    // Fetch user WITH password hash
    const user = await User.findOne({ email, role }).select("+passwordHash +adminKeyHash");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify password
    const passwordOk = await user.comparePassword(password);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // HR: verify companyId matches
    if (role === "hr" && companyId) {
      if (user.companyId !== companyId.trim()) {
        return res.status(401).json({ success: false, message: "Company ID does not match" });
      }
    }

    // Admin: verify admin key
    if (role === "admin" && adminKey) {
      const keyOk = await user.compareAdminKey(adminKey);
      if (!keyOk) {
        return res.status(401).json({ success: false, message: "Invalid admin key" });
      }
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken({ id: user._id, role: user.role });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: user.profile,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user.profile,
  });
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
// Stateless JWT — client just deletes the token.
// This endpoint exists for audit logging purposes.
export const logout = async (req, res) => {
  try {
    req.user.lastLoginAt = new Date();  // optional audit touch
    await req.user.save({ validateBeforeSave: false });
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch {
    return res.status(200).json({ success: true, message: "Logged out" });
  }
};
