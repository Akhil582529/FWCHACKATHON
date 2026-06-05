import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requirements: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    location: { type: String, default: "Remote" },
    salaryRange: { type: String, default: null },
    type: { type: String, enum: ["full-time", "part-time", "contract", "internship"], default: "full-time" },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
    applicants: [
      {
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        appliedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ["applied", "reviewed", "shortlisted", "rejected", "hired"], default: "applied" },
        aiScore: { type: Number, default: null },
        aiSummary: { type: String, default: null },
      },
    ],
  },
  { timestamps: true }
);

jobSchema.index({ postedBy: 1 });
jobSchema.index({ isActive: 1 });
jobSchema.index({ skills: 1 });

const Job = mongoose.model("Job", jobSchema);
export default Job;