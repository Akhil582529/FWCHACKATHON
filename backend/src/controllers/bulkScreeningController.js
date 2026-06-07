import AdmZip from "adm-zip";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import mammoth from "mammoth";
import Groq from "groq-sdk";
import * as XLSX from "xlsx";
import BulkSession from "../models/BulkSession.js";
import BulkCandidate from "../models/BulkCandidate.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const extractText = async (filename, buffer) => {
  const ext = filename.split(".").pop().toLowerCase();
  try {
    if (ext === "pdf")  { const d = await pdfParse(buffer); return d.text?.trim() || ""; }
    if (ext === "docx") { const d = await mammoth.extractRawText({ buffer }); return d.value?.trim() || ""; }
    if (ext === "txt")  { return buffer.toString("utf-8").trim(); }
  } catch { return ""; }
  return "";
};

// POST /api/hr/bulk-screening/sessions
export const createSession = async (req, res) => {
  try {
    const { jobTitle, jobDescription, jobSkills, jobRequirements } = req.body;
    if (!jobTitle?.trim())       return res.status(400).json({ success: false, message: "Job title is required" });
    if (!jobDescription?.trim()) return res.status(400).json({ success: false, message: "Job description is required" });
    if (!req.file)               return res.status(400).json({ success: false, message: "ZIP file is required" });

    // Extract ZIP
    const zip = new AdmZip(req.file.buffer);
    const allEntries = zip.getEntries();
    const entries = allEntries.filter((e) => {
      const name = e.entryName.toLowerCase();
      const base = name.split("/").pop();
      return !e.isDirectory
        && !base.startsWith("._")          // exclude Mac metadata files
        && (name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt"));
    });

    if (entries.length === 0)
      return res.status(400).json({ success: false, message: "No supported resume files found in ZIP (PDF, DOCX, TXT)" });

    // Create session
    const session = await BulkSession.create({
      createdBy:      req.user._id,
      jobTitle:       jobTitle.trim(),
      jobDescription: jobDescription.trim(),
      jobSkills:      jobSkills?.trim() || "",
      jobRequirements:jobRequirements?.trim() || "",
      status:         "processing",
      totalUploaded:  entries.length,
    });

    // Parse resumes
    const resumes = [];
    let failed = 0;
    for (const entry of entries) {
      const filename = entry.entryName.split("/").pop().split("\\").pop();
      if (!filename) continue;
      const buffer = entry.getData();
      let text = await extractText(filename, buffer);

      // Fallback: use filename as text if extraction fails (handles scanned PDFs)
      if (text.length <= 20) {
        const nameFromFile = filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        text = `Candidate Name: ${nameFromFile}`;
      }

      resumes.push({ filename, text: text.slice(0, 2000) });
    }

    if (resumes.length === 0) {
      await BulkSession.findByIdAndUpdate(session._id, { status: "failed", totalFailed: failed });
      return res.status(400).json({ success: false, message: "Could not process any resume in the ZIP" });
    }

    // ── AI screening in batches of 10 ────────────────────────────────────────
    const BATCH_SIZE = 10;
    const allResults = [];

    for (let i = 0; i < resumes.length; i += BATCH_SIZE) {
      const batch = resumes.slice(i, i + BATCH_SIZE);

      const prompt = `
You are a senior technical recruiter AI. Screen these ${batch.length} resumes against the job below.

JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${jobDescription.slice(0, 800)}
REQUIRED SKILLS: ${jobSkills || "Not specified"}
REQUIREMENTS: ${jobRequirements || "Not specified"}

RESUMES:
${batch.map((r, idx) => `--- Resume ${idx + 1}: ${r.filename} ---\n${r.text}`).join("\n\n")}

For each resume, extract contact info and score across 14 weighted factors. Total score must be out of 100.

FACTOR WEIGHTS:
skillMatch=15, relevantExperience=12, educationQualification=8, certifications=5,
industryExperience=7, projectExperience=8, technicalCompetency=10, domainKnowledge=7,
roleRelevance=8, achievementsImpact=5, careerStability=4, communicationQuality=4,
leadershipExperience=4, learningAgility=3

Recommendation rules:
- total >= 80 → "Strong Hire"
- total >= 65 → "Hire"
- total >= 45 → "Consider"
- total < 45  → "Reject"

Return ONLY a valid JSON array sorted by total score descending. No markdown, no backticks:
[
  {
    "fileName": "<filename>",
    "name": "<extracted full name or filename without extension>",
    "email": "<extracted email or empty string>",
    "phone": "<extracted phone or empty string>",
    "extractedEducation": "<high school|bachelor|master|phd|unknown>",
    "extractedExperienceYears": <number or 0>,
    "extractedCertifications": ["cert1"],
    "extractedIndustries": ["industry1"],
    "hasLeadership": <true or false>,
    "skills": ["skill1", "skill2"],
    "recommendation": "<Strong Hire|Hire|Consider|Reject>",
    "summary": "<2 sentence assessment>",
    "strengths": ["strength1"],
    "gaps": ["gap1"],
    "scores": {
      "total": <0-100>,
      "skillMatch": <0-15>,
      "relevantExperience": <0-12>,
      "educationQualification": <0-8>,
      "certifications": <0-5>,
      "industryExperience": <0-7>,
      "projectExperience": <0-8>,
      "technicalCompetency": <0-10>,
      "domainKnowledge": <0-7>,
      "roleRelevance": <0-8>,
      "achievementsImpact": <0-5>,
      "careerStability": <0-4>,
      "communicationQuality": <0-4>,
      "leadershipExperience": <0-4>,
      "learningAgility": <0-3>
    }
  }
]`;

      try {
        const response = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are a JSON-only API. Respond with a valid JSON array and nothing else. No markdown, no backticks, no explanation." },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        });

        const raw = response.choices[0].message.content;
        const jsonStart = raw.indexOf("[");
        const jsonEnd = raw.lastIndexOf("]");
        if (jsonStart === -1 || jsonEnd === -1) {
          console.warn(`Batch ${i}-${i + BATCH_SIZE}: AI returned no JSON, skipping`);
          failed += batch.length;
          continue;
        }

        const batchResults = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
        allResults.push(...batchResults);
        console.log(`Batch ${i + 1}-${i + batch.length}: processed ${batchResults.length} resumes`);
      } catch (err) {
        console.warn(`Batch ${i}-${i + BATCH_SIZE} failed:`, err.message);
        failed += batch.length;
        // skip bad batch, continue with rest
      }
    }

    if (allResults.length === 0) {
      await BulkSession.findByIdAndUpdate(session._id, { status: "failed", totalFailed: failed });
      return res.status(400).json({ success: false, message: "AI could not screen any resumes" });
    }

    // Sort by score descending
    allResults.sort((a, b) => (b.scores?.total || 0) - (a.scores?.total || 0));

    // Save candidates
    const candidates = await BulkCandidate.insertMany(
      allResults.map((r, i) => ({
        session:                  session._id,
        rank:                     i + 1,
        fileName:                 r.fileName || "",
        name:                     r.name || "",
        email:                    r.email || "",
        phone:                    r.phone || "",
        recommendation:           r.recommendation || "Reject",
        summary:                  r.summary || "",
        strengths:                r.strengths || [],
        gaps:                     r.gaps || [],
        skills:                   r.skills || [],
        extractedEducation:       r.extractedEducation || "",
        extractedExperienceYears: r.extractedExperienceYears || 0,
        extractedCertifications:  r.extractedCertifications || [],
        extractedIndustries:      r.extractedIndustries || [],
        hasLeadership:            r.hasLeadership || false,
        scores:                   r.scores || {},
      }))
    );

    // Update session
    await BulkSession.findByIdAndUpdate(session._id, {
      status:         "completed",
      totalProcessed: candidates.length,
      totalFailed:    failed,
    });

    res.json({ success: true, sessionId: session._id });
  } catch (err) {
    console.error("Bulk screening error:", err);
    res.status(500).json({ success: false, message: "Bulk screening failed: " + err.message });
  }
};

// GET /api/hr/bulk-screening/sessions
export const getSessions = async (req, res) => {
  try {
    const sessions = await BulkSession.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/hr/bulk-screening/sessions/:id
export const getSession = async (req, res) => {
  try {
    const session = await BulkSession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const candidates = await BulkCandidate.find({ session: req.params.id });
    const total      = candidates.length;
    const avgScore   = total > 0 ? Math.round(candidates.reduce((s, c) => s + (c.scores?.total || 0), 0) / total) : 0;

    const recommendations = { strongHire: 0, hire: 0, consider: 0, reject: 0 };
    candidates.forEach((c) => {
      if (c.recommendation === "Strong Hire") recommendations.strongHire++;
      else if (c.recommendation === "Hire")   recommendations.hire++;
      else if (c.recommendation === "Consider") recommendations.consider++;
      else recommendations.reject++;
    });

    res.json({ success: true, session, stats: { avgScore, recommendations } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/hr/bulk-screening/sessions/:id/candidates
export const getCandidates = async (req, res) => {
  try {
    const candidates = await BulkCandidate.find({ session: req.params.id }).sort({ rank: 1 });
    res.json({ success: true, candidates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/hr/bulk-screening/candidates/:id/status
export const updateCandidateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "shortlisted", "rejected"].includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });
    const candidate = await BulkCandidate.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, candidate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/hr/bulk-screening/sessions/:id/export
export const exportSession = async (req, res) => {
  try {
    const session    = await BulkSession.findById(req.params.id);
    const candidates = await BulkCandidate.find({ session: req.params.id }).sort({ rank: 1 });

    const rows = candidates.map((c) => ({
      "Rank":               c.rank,
      "Name":               c.name,
      "Email":              c.email,
      "Phone":              c.phone,
      "Score":              c.scores?.total ?? 0,
      "Recommendation":     c.recommendation,
      "Status":             c.status,
      "Experience (yrs)":   c.extractedExperienceYears,
      "Education":          c.extractedEducation,
      "Skills":             c.skills?.join(", "),
      "Certifications":     c.extractedCertifications?.join(", "),
      "Leadership":         c.hasLeadership ? "Yes" : "No",
      "Summary":            c.summary,
      "Strengths":          c.strengths?.join("; "),
      "Gaps":               c.gaps?.join("; "),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 }, { wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 8 },
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 30 },
      { wch: 24 }, { wch: 10 }, { wch: 60 }, { wch: 40 }, { wch: 40 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Screening Results");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `Screening_${session?.jobTitle?.replace(/\s+/g, "_") || req.params.id}.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};