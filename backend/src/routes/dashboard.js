import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth.js";
import {
  getAllJobs, getMyJobs, createJob, deleteJob,
  applyToJob, getAppliedJobs, adminGetAllJobs, toggleJobStatus,
} from "../controllers/jobController.js";
import { rankCandidates, startMockInterview, evaluateMockInterview, reviewProfile } from "../controllers/aiController.js";
import { updateProfile, getProfile } from "../controllers/candidateController.js";
import { scheduleInterview, getHRInterviews, getCandidateInterviews, updateInterviewStatus } from "../controllers/interviewController.js";
import { getAllUsers, toggleUserStatus, getAnalytics } from "../controllers/adminController.js";

const router = Router();

// ── Jobs ──────────────────────────────────────────────────────────────────────
router.get("/jobs",           protect, getAllJobs);
router.get("/jobs/my",        protect, restrictTo("hr"), getMyJobs);
router.get("/jobs/applied",   protect, restrictTo("candidate"), getAppliedJobs);
router.post("/jobs",          protect, restrictTo("hr"), createJob);
router.delete("/jobs/:id",    protect, restrictTo("hr"), deleteJob);
router.post("/jobs/:id/apply",protect, restrictTo("candidate"), applyToJob);

// ── Candidate ─────────────────────────────────────────────────────────────────
router.get("/candidate/profile",  protect, restrictTo("candidate"), getProfile);
router.put("/candidate/profile",  protect, restrictTo("candidate"), updateProfile);

// ── Interviews ────────────────────────────────────────────────────────────────
router.post("/interviews",              protect, restrictTo("hr"), scheduleInterview);
router.get("/interviews/hr",            protect, restrictTo("hr"), getHRInterviews);
router.get("/interviews/candidate",     protect, restrictTo("candidate"), getCandidateInterviews);
router.patch("/interviews/:id/status",  protect, restrictTo("hr"), updateInterviewStatus);

// ── AI / Gemini ───────────────────────────────────────────────────────────────
router.post("/ai/rank-candidates/:jobId", protect, restrictTo("hr"), rankCandidates);
router.post("/ai/mock-interview/start",   protect, restrictTo("candidate"), startMockInterview);
router.post("/ai/mock-interview/evaluate",protect, restrictTo("candidate"), evaluateMockInterview);
router.post("/ai/profile-review",         protect, restrictTo("candidate"), reviewProfile);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get("/admin/users",            protect, restrictTo("admin"), getAllUsers);
router.patch("/admin/users/:id/toggle",protect, restrictTo("admin"), toggleUserStatus);
router.get("/admin/analytics",        protect, restrictTo("admin"), getAnalytics);
router.get("/admin/jobs",             protect, restrictTo("admin"), adminGetAllJobs);
router.patch("/admin/jobs/:id/toggle",protect, restrictTo("admin"), toggleJobStatus);

export default router;