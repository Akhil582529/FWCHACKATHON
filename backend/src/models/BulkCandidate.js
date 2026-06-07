import mongoose from "mongoose";

const bulkCandidateSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BulkSession",
      required: true,
      index: true,
    },
    rank:     { type: Number, default: 0 },
    fileName: { type: String, default: "" },
    name:     { type: String, default: "" },
    email:    { type: String, default: "" },
    phone:    { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "shortlisted", "rejected"],
      default: "pending",
    },
    recommendation: {
      type: String,
      enum: ["Strong Hire", "Hire", "Consider", "Reject"],
      default: "Reject",
    },
    summary:  { type: String, default: "" },
    strengths: { type: [String], default: [] },
    gaps:      { type: [String], default: [] },
    skills:    { type: [String], default: [] },
    extractedEducation:       { type: String, default: "" },
    extractedExperienceYears: { type: Number, default: 0 },
    extractedCertifications:  { type: [String], default: [] },
    extractedIndustries:      { type: [String], default: [] },
    hasLeadership: { type: Boolean, default: false },
    scores: {
      type: {
        total:                    Number,
        skillMatch:               Number,
        relevantExperience:       Number,
        educationQualification:   Number,
        certifications:           Number,
        industryExperience:       Number,
        projectExperience:        Number,
        technicalCompetency:      Number,
        domainKnowledge:          Number,
        roleRelevance:            Number,
        achievementsImpact:       Number,
        careerStability:          Number,
        communicationQuality:     Number,
        leadershipExperience:     Number,
        learningAgility:          Number,
      },
      default: {},
    },
  },
  { timestamps: true }
);

const BulkCandidate = mongoose.model("BulkCandidate", bulkCandidateSchema);
export default BulkCandidate;