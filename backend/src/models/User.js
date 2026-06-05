import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/*
 * ─────────────────────────────────────────────
 *  COLLECTION: users
 *
 *  Schema uses discriminator-style role field so
 *  all three portals live in one collection but
 *  each role has its own required extras.
 * ─────────────────────────────────────────────
 *
 *  Common fields (all roles):
 *    _id, email, passwordHash, role, isActive,
 *    lastLoginAt, createdAt, updatedAt
 *
 *  candidate extras : fullName, resumeUrl, skills[]
 *  hr extras        : fullName, companyId, department
 *  admin extras     : adminKey (hashed), permissions[]
 */

const userSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false,           // never returned in queries by default
    },
    role: {
      type: String,
      enum: ["candidate", "hr", "admin"],
      required: [true, "Role is required"],
      index: true,
    },

    // ── Status ────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },

    // ── Candidate-specific ────────────────────
    fullName: {
      type: String,
      trim: true,
      default: null,
    },
    resumeUrl: {
      type: String,
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },

    // ── HR-specific ───────────────────────────
    companyId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    department: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Admin-specific ────────────────────────
    adminKeyHash: {
      type: String,
      select: false,           // sensitive — never returned by default
      default: null,
    },
    permissions: {
      type: [String],
      enum: ["manage_users", "manage_jobs", "view_analytics", "system_config", "full_access"],
      default: [],
    },
  },
  {
    timestamps: true,          // adds createdAt + updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Compound indexes ──────────────────────────────────────────────────────────
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ email: 1, role: 1 }, { unique: true });

// ── Pre-save: hash password ───────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (this.isModified("passwordHash")) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

// ── Instance method: compare password ────────────────────────────────────────
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// ── Instance method: compare admin key ───────────────────────────────────────
userSchema.methods.compareAdminKey = async function (plain) {
  if (!this.adminKeyHash) return false;
  return bcrypt.compare(plain, this.adminKeyHash);
};

// ── Virtual: safe public profile (no hashes) ─────────────────────────────────
userSchema.virtual("profile").get(function () {
  return {
    id: this._id,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    ...(this.role === "candidate" && {
      fullName: this.fullName,
      skills: this.skills,
      resumeUrl: this.resumeUrl,
    }),
    ...(this.role === "hr" && {
      fullName: this.fullName,
      companyId: this.companyId,
      department: this.department,
    }),
    ...(this.role === "admin" && {
      permissions: this.permissions,
    }),
  };
});

const User = mongoose.model("User", userSchema);
export default User;
