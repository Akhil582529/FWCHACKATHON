import { GoogleGenerativeAI } from "@google/generative-ai";
import Job from "../models/Job.js";
import User from "../models/User.js";
import Interview from "../models/Interview.js";

const getGemini = () => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
};

// POST /api/ai/rank-candidates/:jobId — HR: rank all applicants for a job
export const rankCandidates = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId)
      .populate("applicants.candidate", "fullName email skills resumeUrl resumeText");

    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    if (job.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not your job" });
    if (job.applicants.length === 0)
      return res.status(400).json({ success: false, message: "No applicants yet" });

    const model = getGemini();

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

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const rankings = JSON.parse(text);

    // Save AI scores back to job applicants
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
    console.error("Gemini rank error:", err);
    res.status(500).json({ success: false, message: "AI ranking failed: " + err.message });
  }
};

// POST /api/ai/mock-interview/start — Candidate: generate interview questions
export const startMockInterview = async (req, res) => {
  try {
    const { jobTitle, skills, jobDescription } = req.body;
    if (!jobTitle) return res.status(400).json({ success: false, message: "jobTitle is required" });

    const model = getGemini();
    const prompt = `
You are a technical interviewer. Generate 5 interview questions for this role.

Role: ${jobTitle}
Skills: ${skills || "General software engineering"}
${jobDescription ? `Description: ${jobDescription}` : ""}

Return ONLY a valid JSON array of 5 strings (no markdown, no numbering):
["question1", "question2", "question3", "question4", "question5"]

Mix: 2 technical, 1 problem-solving, 1 behavioral, 1 situational.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const questions = JSON.parse(text);

    res.json({ success: true, questions });
  } catch (err) {
    console.error("Mock interview start error:", err);
    res.status(500).json({ success: false, message: "Failed to generate questions: " + err.message });
  }
};

// POST /api/ai/mock-interview/evaluate — Candidate: evaluate answers
export const evaluateMockInterview = async (req, res) => {
  try {
    const { jobTitle, questions, answers } = req.body;
    if (!questions?.length || !answers?.length)
      return res.status(400).json({ success: false, message: "Questions and answers required" });

    const model = getGemini();
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

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const evaluation = JSON.parse(text);

    res.json({ success: true, evaluation });
  } catch (err) {
    console.error("Mock interview eval error:", err);
    res.status(500).json({ success: false, message: "Evaluation failed: " + err.message });
  }
};

// POST /api/ai/profile-review — Candidate: AI reviews their profile
export const reviewProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const model = getGemini();

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

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const review = JSON.parse(text);

    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: "Profile review failed: " + err.message });
  }
};

// POST /api/ai/interview-questions/:id — candidate: generate questions for a scheduled interview
export const generateInterviewQuestions = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate("job", "title skills description");

    if (!interview) return res.status(404).json({ success: false, message: "Interview not found" });
    if (interview.candidate.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not your interview" });

    // Return existing questions without calling Gemini again
    if (interview.mockQuestions.length > 0)
      return res.json({ success: true, questions: interview.mockQuestions });

    const model = getGemini();
    const prompt = `
You are a technical interviewer. Generate 5 interview questions for this role.

Role: ${interview.job.title}
Required Skills: ${interview.job.skills?.join(", ") || "General skills"}
Description: ${interview.job.description}

Return ONLY a valid JSON array of 5 strings (no markdown, no numbering):
["question1", "question2", "question3", "question4", "question5"]

Mix: 2 technical, 1 problem-solving, 1 behavioral, 1 situational.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const questions = JSON.parse(text);

    interview.mockQuestions = questions;
    await interview.save();

    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to generate questions: " + err.message });
  }
};

// POST /api/ai/evaluate-interview/:id — HR: AI evaluate a completed interview
export const evaluateInterview = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate("candidate", "fullName email resumeText")
      .populate("job", "title description skills requirements");

    if (!interview) return res.status(404).json({ success: false, message: "Interview not found" });
    if (interview.scheduledBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not your interview" });

    const model = getGemini();
    const { candidate, job } = interview;

    const hasAnswers = interview.mockAnswers.length > 0;
    const qa = hasAnswers
      ? interview.mockQuestions.map((q, i) =>
          `Q${i + 1}: ${q}\nA${i + 1}: ${interview.mockAnswers[i] || "No answer"}`
        ).join("\n\n")
      : null;

    const prompt = `
You are a senior technical interviewer evaluating a real job interview.

POSITION: ${job.title}
REQUIRED SKILLS: ${job.skills?.join(", ") || "Not specified"}
REQUIREMENTS: ${job.requirements?.join(", ") || "Not specified"}
JOB DESCRIPTION: ${job.description}

CANDIDATE RESUME:
${candidate.resumeText ? candidate.resumeText.slice(0, 2000) : "Not provided — evaluate based on interview answers only"}

INTERVIEW Q&A:
${hasAnswers ? qa : "Candidate did not submit written answers — evaluate based on resume and job fit only"}

Return ONLY valid JSON (no markdown):
{
  "overallScore": <0-100>,
  "technicalScore": <0-100>,
  "communicationScore": <0-100>,
  "confidenceScore": <0-100>,
  "recommendation": "<hire/consider/pass>",
  "summary": "<3-4 sentence overall assessment>",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const evaluation = JSON.parse(text);

    interview.mockScore          = evaluation.overallScore;
    interview.mockFeedback       = evaluation.summary;
    interview.technicalScore     = evaluation.technicalScore;
    interview.communicationScore = evaluation.communicationScore;
    interview.confidenceScore    = evaluation.confidenceScore;
    interview.recommendation     = evaluation.recommendation;
    await interview.save();

    res.json({ success: true, evaluation });
  } catch (err) {
    console.error("Interview evaluation error:", err);
    res.status(500).json({ success: false, message: "Evaluation failed: " + err.message });
  }
};