import multer   from "multer";
import AdmZip   from "adm-zip";
import ScreeningSession        from "../../models/bulkScreening/ScreeningSession.js";
import ScreenedCandidate       from "../../models/bulkScreening/ScreenedCandidate.js";
import { extractPdfText }      from "../../utils/pdfExtractor.js";
import { parseResume }         from "../../utils/resumeParser.js";
import { scoreCandidate }      from "../../utils/bulkScorer.js";
import { exportCandidatesToExcel } from "../../utils/excelExporter.js";

// ── Multer — memory storage, ZIP only, 50 MB limit ───────────────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isZip =
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.originalname.toLowerCase().endsWith(".zip");
    isZip
      ? cb(null, true)
      : cb(new Error("Only ZIP files are allowed"), false);
  },
});

// ── POST /api/bulk-screening/sessions ────────────────────────────────────────
export const createSession = async (req, res) => {
  const { jobTitle, jobDescription, jobSkills, jobRequirements } = req.body;

  if (!jobTitle || !jobDescription)
    return res.status(400).json({ success: false, message: "jobTitle and jobDescription are required" });
  if (!req.file)
    return res.status(400).json({ success: false, message: "ZIP file is required" });

  // Parse optional comma / newline delimited fields
  const skillsArr = jobSkills
    ? jobSkills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const reqsArr = jobRequirements
    ? jobRequirements.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];

  // Create session in processing state first so we have an _id
  const session = await ScreeningSession.create({
    hrId:            req.user._id,
    jobTitle,
    jobDescription,
    jobSkills:       skillsArr,
    jobRequirements: reqsArr,
    status:          "processing",
  });

  try {
    // Extract PDF entries from ZIP buffer
    const zip        = new AdmZip(req.file.buffer);
    const pdfEntries = zip.getEntries().filter(
      (e) => !e.isDirectory && e.entryName.toLowerCase().endsWith(".pdf")
    );

    if (pdfEntries.length === 0) {
      session.status = "failed";
      await session.save();
      return res.status(400).json({ success: false, message: "No PDF files found in the ZIP" });
    }

    const job = {
      title:        jobTitle,
      skills:       skillsArr,
      requirements: reqsArr,
      description:  jobDescription,
    };

    // Process all PDFs in parallel; failures do not abort the batch
    const settled = await Promise.allSettled(
      pdfEntries.map(async (entry) => {
        const fileName    = entry.entryName.split("/").pop();
        const filenameStem = fileName.replace(/\.pdf$/i, "");

        const resumeText = await extractPdfText(entry.getData());
        if (!resumeText) throw new Error(`Empty or corrupt PDF: ${fileName}`);

        const parsed = parseResume(resumeText, filenameStem);
        const { score, breakdown, summary, strengths, gaps, recommendation } =
          scoreCandidate({ ...parsed, resumeText }, job);

        return {
          sessionId:  session._id,
          fileName,
          name:       parsed.name,
          email:      parsed.email,
          phone:      parsed.phone,
          skills:     parsed.skills,
          resumeText,
          // Fix 1: persist extracted signals
          extractedExperienceYears: parsed.extractedExperienceYears,
          extractedEducation:       parsed.extractedEducation,
          extractedCertifications:  parsed.extractedCertifications,
          extractedIndustries:      parsed.extractedIndustries,
          extractedTitles:          parsed.extractedTitles,
          projectCount:             parsed.projectCount,
          achievementCount:         parsed.achievementCount,
          estimatedJobCount:        parsed.estimatedJobCount,
          hasLeadership:            parsed.hasLeadership,
          // Fix 2: persist all 14 individual factor scores
          scores: {
            skillMatch:             breakdown.skillMatch,
            requirementMatch:       breakdown.requirementMatch,
            completeness:           breakdown.completeness,
            keywordRelevance:       breakdown.keywordRelevance,
            relevantExperience:     breakdown.relevantExperience,
            educationQualification: breakdown.educationQualification,
            certifications:         breakdown.certifications,
            industryExperience:     breakdown.industryExperience,
            projectExperience:      breakdown.projectExperience,
            technicalCompetency:    breakdown.technicalCompetency,
            domainKnowledge:        breakdown.domainKnowledge,
            roleRelevance:          breakdown.roleRelevance,
            achievementsImpact:     breakdown.achievementsImpact,
            careerStability:        breakdown.careerStability,
            communicationQuality:   breakdown.communicationQuality,
            leadershipExperience:   breakdown.leadershipExperience,
            learningAgility:        breakdown.learningAgility,
            total:                  score,
          },
          recommendation,
          summary,
          strengths,
          gaps,
          status: "pending",
        };
      })
    );

    const successful  = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
    const totalFailed = settled.filter((r) => r.status === "rejected").length;

    // Sort by total score descending and assign rank
    successful.sort((a, b) => b.scores.total - a.scores.total);
    successful.forEach((c, i) => { c.rank = i + 1; });

    // Guard: all PDFs failed extraction
    if (successful.length === 0) {
      session.status         = "failed";
      session.totalUploaded  = pdfEntries.length;
      session.totalProcessed = 0;
      session.totalFailed    = totalFailed;
      await session.save();
      return res.status(400).json({ success: false, message: "No resumes could be processed" });
    }

    // Bulk insert — preserves order so slice(0,5) gives genuine top candidates
    const inserted = await ScreenedCandidate.insertMany(successful);

    // Finalise session
    session.status         = "completed";
    session.totalUploaded  = pdfEntries.length;
    session.totalProcessed = successful.length;
    session.totalFailed    = totalFailed;
    await session.save();

    const topCandidates = inserted.slice(0, 5).map((c) => ({
      id:             c._id,
      rank:           c.rank,
      name:           c.name,
      email:          c.email,
      score:          c.scores.total,
      recommendation: c.recommendation,
    }));

    return res.status(201).json({
      success: true,
      sessionId:      session._id,
      totalUploaded:  session.totalUploaded,
      totalProcessed: session.totalProcessed,
      totalFailed:    session.totalFailed,
      topCandidates,
    });
  } catch (err) {
    session.status = "failed";
    await session.save();
    console.error("Bulk screening error:", err);
    return res.status(500).json({ success: false, message: "Bulk screening failed: " + err.message });
  }
};

// ── GET /api/bulk-screening/sessions ─────────────────────────────────────────
export const getSessions = async (req, res) => {
  try {
    const sessions = await ScreeningSession.find({ hrId: req.user._id })
      .select("jobTitle status totalUploaded totalProcessed totalFailed createdAt")
      .sort({ createdAt: -1 });
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/bulk-screening/sessions/:id ─────────────────────────────────────
export const getSessionDetails = async (req, res) => {
  try {
    const session = await ScreeningSession.findOne({
      _id:  req.params.id,
      hrId: req.user._id,
    });
    if (!session)
      return res.status(404).json({ success: false, message: "Session not found" });

    const [stats] = await ScreenedCandidate.aggregate([
      { $match: { sessionId: session._id } },
      {
        $group: {
          _id:              null,
          avgScore:         { $avg: "$scores.total" },
          shortlistedCount: { $sum: { $cond: [{ $eq: ["$status", "shortlisted"] }, 1, 0] } },
          strongHireCount:  { $sum: { $cond: [{ $eq: ["$recommendation", "Strong Hire"] }, 1, 0] } },
          hireCount:        { $sum: { $cond: [{ $eq: ["$recommendation", "Hire"] }, 1, 0] } },
          considerCount:    { $sum: { $cond: [{ $eq: ["$recommendation", "Consider"] }, 1, 0] } },
          rejectCount:      { $sum: { $cond: [{ $eq: ["$recommendation", "Reject"] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      session,
      stats: stats
        ? {
            avgScore:         Math.round(stats.avgScore),
            shortlistedCount: stats.shortlistedCount,
            recommendations: {
              strongHire: stats.strongHireCount,
              hire:        stats.hireCount,
              consider:    stats.considerCount,
              reject:      stats.rejectCount,
            },
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/bulk-screening/sessions/:id/candidates ──────────────────────────
export const getSessionCandidates = async (req, res) => {
  try {
    const session = await ScreeningSession.findOne({
      _id:  req.params.id,
      hrId: req.user._id,
    });
    if (!session)
      return res.status(404).json({ success: false, message: "Session not found" });

    const { status, page = 1, limit = 50 } = req.query;
    const filter = { sessionId: session._id };
    if (status) filter.status = status;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [candidates, total] = await Promise.all([
      ScreenedCandidate.find(filter)
        .select("-resumeText")         // exclude large text from list view
        .sort({ rank: 1 })
        .skip(skip)
        .limit(limitNum),
      ScreenedCandidate.countDocuments(filter),
    ]);

    res.json({
      success: true,
      candidates,
      pagination: {
        total,
        page:  pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/bulk-screening/candidates/:id/status ──────────────────────────
export const updateCandidateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ALLOWED = ["pending", "shortlisted", "rejected"];

    if (!status || !ALLOWED.includes(status))
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${ALLOWED.join(", ")}`,
      });

    const candidate = await ScreenedCandidate.findById(req.params.id);
    if (!candidate)
      return res.status(404).json({ success: false, message: "Candidate not found" });

    // Verify the candidate's session belongs to this HR user
    const session = await ScreeningSession.findOne({
      _id:  candidate.sessionId,
      hrId: req.user._id,
    });
    if (!session)
      return res.status(404).json({ success: false, message: "Candidate not found" });

    candidate.status = status;
    await candidate.save();

    res.json({ success: true, candidate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/bulk-screening/sessions/:id/export ───────────────────────────────
export const exportSession = async (req, res) => {
  try {
    const session = await ScreeningSession.findOne({
      _id:  req.params.id,
      hrId: req.user._id,
    });
    if (!session)
      return res.status(404).json({ success: false, message: "Session not found" });

    const candidates = await ScreenedCandidate.find({ sessionId: session._id })
      .sort({ rank: 1 });

    if (candidates.length === 0)
      return res.status(400).json({ success: false, message: "No candidates to export" });

    const buffer = exportCandidatesToExcel(candidates);

    res.setHeader("Content-Disposition", `attachment; filename="screening-${session._id}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
