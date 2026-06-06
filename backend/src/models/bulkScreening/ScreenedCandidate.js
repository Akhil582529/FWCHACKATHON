import mongoose from "mongoose";

const screenedCandidateSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScreeningSession",
      required: true,
    },
    fileName: { type: String, required: true, trim: true },
    name:     { type: String, default: null, trim: true },
    email:    { type: String, default: null, lowercase: true, trim: true },
    phone:    { type: String, default: null, trim: true },
    skills:   { type: [String], default: [] },
    resumeText: { type: String, default: null },

    // ── Extracted signals ─────────────────────────────────────────────────────
    // Populated by parseResume(); controller passes only name/email/phone/skills
    // today — these fields are ready for a future one-line controller update.
    extractedExperienceYears: { type: Number,  default: null },
    extractedEducation: {
      type: String,
      enum: ["phd", "masters", "bachelors", "diploma", "unknown"],
      default: "unknown",
    },
    extractedCertifications: { type: [String], default: [] },
    extractedIndustries:     { type: [String], default: [] },
    extractedTitles:         { type: [String], default: [] },
    projectCount:            { type: Number,  default: 0 },
    achievementCount:        { type: Number,  default: 0 },
    estimatedJobCount:       { type: Number,  default: 0 },
    hasLeadership:           { type: Boolean, default: false },

    // ── Scores ────────────────────────────────────────────────────────────────
    scores: {
      // ── Legacy grouped keys (stored by the current controller) ─────────────
      // Values are sums of related 14-factor sub-scores; max values updated to
      // reflect new distributions.  See bulkScorer.js for grouping details.
      skillMatch:       { type: Number, default: 0, min: 0, max: 15 }, // factor 1
      requirementMatch: { type: Number, default: 0, min: 0, max: 20 }, // factors 2+9
      completeness:     { type: Number, default: 0, min: 0, max: 21 }, // factors 3+4+12+11
      keywordRelevance: { type: Number, default: 0, min: 0, max: 44 }, // factors 5-8+10+13+14

      // ── Individual 14-factor breakdown (ready for future controller pass-through)
      relevantExperience:     { type: Number, default: 0, min: 0, max: 12 },
      educationQualification: { type: Number, default: 0, min: 0, max: 8  },
      certifications:         { type: Number, default: 0, min: 0, max: 5  },
      industryExperience:     { type: Number, default: 0, min: 0, max: 7  },
      projectExperience:      { type: Number, default: 0, min: 0, max: 8  },
      technicalCompetency:    { type: Number, default: 0, min: 0, max: 10 },
      domainKnowledge:        { type: Number, default: 0, min: 0, max: 7  },
      roleRelevance:          { type: Number, default: 0, min: 0, max: 8  },
      achievementsImpact:     { type: Number, default: 0, min: 0, max: 5  },
      careerStability:        { type: Number, default: 0, min: 0, max: 4  },
      communicationQuality:   { type: Number, default: 0, min: 0, max: 4  },
      leadershipExperience:   { type: Number, default: 0, min: 0, max: 4  },
      learningAgility:        { type: Number, default: 0, min: 0, max: 3  },

      total: { type: Number, default: 0, min: 0, max: 100 },
    },

    recommendation: {
      type: String,
      enum: ["Strong Hire", "Hire", "Consider", "Reject"],
      default: "Reject",
    },
    summary:   { type: String,   default: null },
    strengths: { type: [String], default: [] },
    gaps:      { type: [String], default: [] },
    status: {
      type: String,
      enum: ["pending", "shortlisted", "rejected"],
      default: "pending",
    },
    rank: { type: Number, default: null },
  },
  { timestamps: true }
);

screenedCandidateSchema.index({ sessionId: 1 });
screenedCandidateSchema.index({ "scores.total": -1 });
screenedCandidateSchema.index({ sessionId: 1, rank: 1 });

const ScreenedCandidate = mongoose.model("ScreenedCandidate", screenedCandidateSchema);
export default ScreenedCandidate;
