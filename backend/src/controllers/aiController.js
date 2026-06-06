// backend/src/controllers/ai.js
import Groq from "groq-sdk";
import Job from "../models/Job.js";
import User from "../models/User.js";
import Interview from "../models/Interview.js";

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

// helper — mirrors model.generateContent() return shape
const generate = async (prompt) => {
  const groq = getGroq();
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });
  return res.choices[0].message.content;
};

// POST /api/ai/rank-candidates/:jobId
export const rankCandidates = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId)
      .populate("applicants.candidate", "fullName email skills resumeUrl resumeText");

    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    if (job.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not your job" });
    if (job.applicants.length === 0)
      return res.status(400).json({ success: false, message: "No applicants yet" });

    const candidateList = job.applicants
      .filter((a) => a.candidate)
      .map((a, i) => ({
        index: i,
        name: a.candidate.fullName || a.candidate.email,
        email: a.candidate.email,
        skills: a.candidate.skills?.join(", ") || "Not specified",
        resumeText: a.candidate.resumeText || null,
        id: a.candidate._id.toString(),
      }));

    const prompt = `
You are a senior technical recruiter AI. Analyze these candidates for the job below and rank them.

JOB TITLE: ${job.title}
JOB DESCRIPTION: ${job.description}
REQUIRED SKILLS: ${job.skills.join(", ")}
REQUIREMENTS: ${job.requirements.join(", ")}

CANDIDATES:
${candidateList.map((c) => `${c.index + 1}. Name: ${c.name}
   Skills: ${c.skills}
   Resume: ${c.resumeText ? c.resumeText.slice(0, 3000) : "Not provided — evaluate on skills only"}`).join("\n\n")}

Return ONLY a valid JSON array (no markdown, no explanation) in this exact format:
[
  {
    "id": "<candidate_id>",
    "name": "<name>",
    "score": <0-100>,
    "summary": "<2 sentence assessment>",
    "strengths": ["strength1", "strength2"],
    "gaps": ["gap1", "gap2"]
  }
]

Use the index order to map back to ids: ${candidateList.map((c) => `index ${c.index} = id ${c.id}`).join(", ")}
Sort by score descending.
`;

    const text = (await generate(prompt)).replace(/```json|```/g, "").trim();
    const rankings = JSON.parse(text);

    for (const rank of rankings) {
      const applicant = job.applicants.find(
        (a) => a.candidate._id.toString() === rank.id
      );
      if (applicant) {
        applicant.aiScore = rank.score;
        applicant.aiSummary = rank.summary;
        if (rank.score >= 70) applicant.status = "shortlisted";
      }
    }
    await job.save();

    res.json({ success: true, rankings });
  } catch (err) {
    console.error("Groq rank error:", err);
    res.status(500).json({ success: false, message: "AI ranking failed: " + err.message });
  }
};

// POST /api/ai/mock-interview/start
export const startMockInterview = async (req, res) => {
  try {
    const { jobTitle, skills, jobDescription } = req.body;
    if (!jobTitle) return res.status(400).json({ success: false, message: "jobTitle is required" });

    const prompt = `
You are a technical interviewer. Generate 5 interview questions for this role.

Role: ${jobTitle}
Skills: ${skills || "General software engineering"}
${jobDescription ? `Description: ${jobDescription}` : ""}

Return ONLY a valid JSON array of 5 strings (no markdown, no numbering):
["question1", "question2", "question3", "question4", "question5"]

Mix: 2 technical, 1 problem-solving, 1 behavioral, 1 situational.
`;

    const text = (await generate(prompt)).replace(/```json|```/g, "").trim();
    const questions = JSON.parse(text);

    res.json({ success: true, questions });
  } catch (err) {
    console.error("Mock interview start error:", err);
    res.status(500).json({ success: false, message: "Failed to generate questions: " + err.message });
  }
};

// POST /api/ai/mock-interview/evaluate
export const evaluateMockInterview = async (req, res) => {
  try {
    const { jobTitle, questions, answers } = req.body;
    if (!questions?.length || !answers?.length)
      return res.status(400).json({ success: false, message: "Questions and answers required" });

    const qa = questions.map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] || "No answer"}`).join("\n\n");

    const prompt = `
You are a senior technical interviewer evaluating a mock interview.

Role: ${jobTitle}
Interview Q&A:
${qa}

Return ONLY a valid JSON object (no markdown):
{
  "overallScore": <0-100>,
  "grade": "<A/B/C/D/F>",
  "summary": "<3-4 sentence overall assessment>",
  "feedback": [
    { "question": "q1 short", "score": <0-20>, "feedback": "feedback text" },
    ...5 items
  ],
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "recommendation": "<hire/consider/pass>"
}
`;

    const text = (await generate(prompt)).replace(/```json|```/g, "").trim();
    const evaluation = JSON.parse(text);

    res.json({ success: true, evaluation });
  } catch (err) {
    console.error("Mock interview eval error:", err);
    res.status(500).json({ success: false, message: "Evaluation failed: " + err.message });
  }
};

// POST /api/ai/profile-review
export const reviewProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const prompt = `
Review this candidate's profile and give actionable advice.

Name: ${user.fullName || "Not set"}
Skills: ${user.skills?.join(", ") || "None listed"}
Resume: ${user.resumeText ? user.resumeText.slice(0, 3000) : "Not provided — assess based on skills only"}

Return ONLY valid JSON (no markdown):
{
  "profileScore": <0-100>,
  "summary": "<2 sentence summary>",
  "tips": ["tip1", "tip2", "tip3", "tip4"],
  "missingSkills": ["skill1", "skill2"],
  "profileStrength": "<weak/moderate/strong>"
}
`;

    const text = (await generate(prompt)).replace(/```json|```/g, "").trim();
    const review = JSON.parse(text);

    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: "Profile review failed: " + err.message });
  }
};