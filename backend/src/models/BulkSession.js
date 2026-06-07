import mongoose from "mongoose";

const bulkSessionSchema = new mongoose.Schema(
  {
    createdBy: {
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
      type: String,
      default: "",
    },
    jobRequirements: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    totalUploaded:  { type: Number, default: 0 },
    totalProcessed: { type: Number, default: 0 },
    totalFailed:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

const BulkSession = mongoose.model("BulkSession", bulkSessionSchema);
export default BulkSession;