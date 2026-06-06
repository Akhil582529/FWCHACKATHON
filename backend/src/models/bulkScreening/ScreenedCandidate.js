import mongoose from "mongoose";

const screenedCandidateSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScreeningSession",
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    resumeText: {
      type: String,
      default: null,
    },
    scores: {
      skillMatch: {
        type: Number,
        default: 0,
        min: 0,
        max: 40,
      },
      requirementMatch: {
        type: Number,
        default: 0,
        min: 0,
        max: 30,
      },
      completeness: {
        type: Number,
        default: 0,
        min: 0,
        max: 15,
      },
      keywordRelevance: {
        type: Number,
        default: 0,
        min: 0,
        max: 15,
      },
      total: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    recommendation: {
      type: String,
      enum: ["Strong Hire", "Hire", "Consider", "Reject"],
      default: "Reject",
    },
    summary: {
      type: String,
      default: null,
    },
    strengths: {
      type: [String],
      default: [],
    },
    gaps: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "shortlisted", "rejected"],
      default: "pending",
    },
    rank: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

screenedCandidateSchema.index({ sessionId: 1 });
screenedCandidateSchema.index({ "scores.total": -1 });
screenedCandidateSchema.index({ sessionId: 1, rank: 1 });

const ScreenedCandidate = mongoose.model("ScreenedCandidate", screenedCandidateSchema);
export default ScreenedCandidate;
