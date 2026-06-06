import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // HR
    scheduledAt: { type: Date, required: true },
    mode: { type: String, enum: ["online", "in-person", "phone"], default: "online" },
    status: { type: String, enum: ["scheduled", "completed", "cancelled", "no-show"], default: "scheduled" },
    meetLink: { type: String, default: null },
    notes: { type: String, default: null },
    // AI Mock Interview fields
    isMock: { type: Boolean, default: false },
    mockQuestions: { type: [String], default: [] },
    mockAnswers: { type: [String], default: [] },
    mockFeedback: { type: String, default: null },
    mockScore: { type: Number, default: null },
    // AI evaluation breakdown
    technicalScore:      { type: Number, default: null },
    communicationScore:  { type: Number, default: null },
    confidenceScore:     { type: Number, default: null },
    recommendation:      { type: String, default: null },
  },
  { timestamps: true }
);

const Interview = mongoose.model("Interview", interviewSchema);
export default Interview;