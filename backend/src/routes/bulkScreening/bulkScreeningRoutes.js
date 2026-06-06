import { Router } from "express";
import { protect, restrictTo } from "../../middleware/auth.js";
import {
  upload,
  createSession,
  getSessions,
  getSessionDetails,
  getSessionCandidates,
  exportSession,
} from "../../controllers/bulkScreening/bulkScreeningController.js";

const router = Router();

router.post("/sessions",                    protect, restrictTo("hr"), upload.single("zip"), createSession);
router.get("/sessions",                     protect, restrictTo("hr"), getSessions);
router.get("/sessions/:id",                 protect, restrictTo("hr"), getSessionDetails);
router.get("/sessions/:id/candidates",      protect, restrictTo("hr"), getSessionCandidates);
router.get("/sessions/:id/export",          protect, restrictTo("hr"), exportSession);

export default router;
