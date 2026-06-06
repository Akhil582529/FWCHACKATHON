import mongoose from "mongoose";

const screeningSessionSchema = new mongoose.Schema(
  {
    hrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    jobDescription: {
      type: String,
      required: true,
    },
    jobSkills: {
      type: [String],
      default: [],
    },
    jobRequirements: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    totalUploaded: {
      type: Number,
      default: 0,
    },
    totalProcessed: {
      type: Number,
      default: 0,
    },
    totalFailed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

screeningSessionSchema.index({ hrId: 1 });
screeningSessionSchema.index({ status: 1 });

const ScreeningSession = mongoose.model("ScreeningSession", screeningSessionSchema);
export default ScreeningSession;
