import AdmZip from "adm-zip";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import mammoth from "mammoth";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const extractText = async (filename, buffer) => {
  const ext = filename.split(".").pop().toLowerCase();
  try {
    if (ext === "pdf") {
      const data = await pdfParse(buffer);
      return data.text?.trim() || "";
    }
    if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      return result.value?.trim() || "";
    }
    if (ext === "txt") {
      return buffer.toString("utf-8").trim();
    }
  } catch {
    return "";
  }
  return "";
};

// POST /api/hr/bulk-screen
export const bulkScreen = async (req, res) => {
  try {
    const { jobDescription } = req.body;
    if (!jobDescription?.trim())
      return res.status(400).json({ success: false, message: "Job description is required" });
    if (!req.file)
      return res.status(400).json({ success: false, message: "ZIP file is required" });

    // Extract ZIP
    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries().filter((e) => {
      const name = e.entryName.toLowerCase();
      return !e.isDirectory && (name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt"));
    });

    if (entries.length === 0)
      return res.status(400).json({ success: false, message: "No supported resume files found in ZIP (PDF, DOCX, TXT)" });

    // Parse all resumes
    const resumes = [];
    for (const entry of entries) {
      const filename = entry.entryName.split("/").pop().split("\\").pop();
      const buffer = entry.getData();
      const text = await extractText(filename, buffer);
      const cleanName = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      resumes.push({
        name: cleanName || filename,
        text: text.length > 50 ? text.slice(0, 1500) : `[Could not extract text from ${filename}]`,
      });
    }

    if (resumes.length === 0)
      return res.status(400).json({ success: false, message: `ZIP contains ${entries.length} file(s) but none could be read. Ensure files are PDF, DOCX, or TXT and not password-protected.` });

    // Build AI prompt
    const prompt = `
You are a senior technical recruiter AI. Screen these ${resumes.length} resumes against the job description below.

JOB DESCRIPTION:
${jobDescription.slice(0, 2000)}

RESUMES:
${resumes.map((r, i) => `--- Resume ${i + 1}: ${r.name} ---\n${r.text}`).join("\n\n")}

Score each candidate on ALL 14 factors (0-100 each). Overall score is weighted average.

FACTORS:
1. skillMatch, 2. relevantExperience, 3. educationQualification, 4. certifications,
5. industryExperience, 6. projectExperience, 7. technicalCompetency, 8. domainKnowledge,
9. roleRelevance, 10. achievementsImpact, 11. careerStability, 12. communicationResumeQuality,
13. leadershipExperience, 14. learningAgility

Return ONLY a valid JSON array sorted by score descending (no markdown):
[
  {
    "name": "<candidate name or filename>",
    "score": <0-100>,
    "experience": "<e.g. 3 years>",
    "status": "<Shortlist | Review | Reject>",
    "summary": "<2 sentence assessment>",
    "strengths": ["s1", "s2"],
    "gaps": ["g1", "g2"],
    "factors": {
      "skillMatch": 0, "relevantExperience": 0, "educationQualification": 0,
      "certifications": 0, "industryExperience": 0, "projectExperience": 0,
      "technicalCompetency": 0, "domainKnowledge": 0, "roleRelevance": 0,
      "achievementsImpact": 0, "careerStability": 0, "communicationResumeQuality": 0,
      "leadershipExperience": 0, "learningAgility": 0
    }
  }
]

Rules: score >= 75 → Shortlist, 50-74 → Review, < 50 → Reject.
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a JSON-only API. You must respond with a valid JSON array and nothing else. No explanations, no apologies, no markdown." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });

    const raw = response.choices[0].message.content;
    const jsonStart = raw.indexOf("[");
    const jsonEnd   = raw.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1)
      throw new Error("AI did not return valid JSON. Try with fewer resumes or a clearer job description.");
    const results = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

    res.json({ success: true, results, total: results.length });
  } catch (err) {
    console.error("Bulk screen error:", err);
    res.status(500).json({ success: false, message: "Bulk screening failed: " + err.message });
  }
};
