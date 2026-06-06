import { GoogleGenerativeAI } from "@google/generative-ai";
import Job from "../models/Job.js";
import User from "../models/User.js";
import Interview from "../models/Interview.js";

const getGemini = () => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
};

// Local scoring engine — no external API calls
// Skill Match: 40pts | Requirement Match: 30pts | Resume Completeness: 15pts | Keyword Relevance: 15pts
const scoreCandidate = (candidate, job) => {
  const jobSkills      = (job.skills        || []).map((s) => s.toLowerCase().trim());
  const jobRequirements = job.requirements  || [];
  const jobDescription  = (job.description || "").toLowerCase();
  const candidateSkills = (candidate.skills || []).map((s) => s.toLowerCase().trim());
  const resumeText      = (candidate.resumeText || "").toLowerCase();

  // 1. Skill Match (40 pts)
  const matchedSkills  = jobSkills.filter((s) => candidateSkills.includes(s));
  const missingSkills  = jobSkills.filter((s) => !candidateSkills.includes(s));
  const skillScore     = jobSkills.length > 0
    ? Math.round((matchedSkills.length / jobSkills.length) * 40)
    : 20;

  // 2. Requirement Match (30 pts) — keyword presence in resumeText
  const matchedReqs = jobRequirements.filter((req) => {
    const words = req.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    return words.length > 0 && words.some((w) => resumeText.includes(w));
  });
  const reqScore = jobRequirements.length > 0
    ? Math.round((matchedReqs.length / jobRequirements.length) * 30)
    : 15;

  // 3. Resume Completeness (15 pts)
  let completenessScore = 0;
  if (resumeText.length > 200)     completenessScore += 10;
  else if (resumeText.length > 50) completenessScore += 5;
  if (candidate.resumeUrl)         completenessScore += 3;
  if (candidate.fullName)          completenessScore += 2;

  // 4. Keyword Relevance (15 pts) — job description terms found in resume
  const STOPWORDS = new Set([
    "with", "that", "this", "have", "will", "from", "they", "been", "their",
    "would", "about", "into", "through", "during", "before", "after", "above",
    "below", "between", "each", "other", "should", "must", "able", "work",
    "team", "experience", "candidate", "required", "skills", "knowledge",
  ]);
  const jobKeywords = [
    ...new Set(jobDescription.split(/\W+/).filter((w) => w.length > 4 && !STOPWORDS.has(w))),
  ];
  const matchedKeywords = jobKeywords.filter((kw) => resumeText.includes(kw));
  const keywordScore    = jobKeywords.length > 0
    ? Math.round((matchedKeywords.length / jobKeywords.length) * 15)
    : 7;

  const score = Math.min(100, skillScore + reqScore + completenessScore + keywordScore);

  // Strengths — matched skills + met requirements
  const strengths = [
    ...matchedSkills.slice(0, 2).map((s) => `Proficient in ${s}`),
    ...(matchedReqs.length > 0 ? [`Meets ${matchedReqs.length} of ${jobRequirements.length} listed requirements`] : []),
  ];
  if (strengths.length === 0) strengths.push("Profile submitted for review");

  // Gaps — missing skills + unmet requirements
  const gaps = [
    ...missingSkills.slice(0, 2).map((s) => `Missing skill: ${s}`),
    ...(matchedReqs.length < jobRequirements.length
      ? [`${jobRequirements.length - matchedReqs.length} requirement(s) not evidenced in resume`]
      : []),
  ];
  if (gaps.length === 0) gaps.push("No significant gaps identified");

  // Recommendation label
  const recommendation =
    score >= 85 ? "Strong Hire" :
    score >= 70 ? "Hire"        :
    score >= 50 ? "Consider"    : "Reject";

  const summary =
    `Matched ${matchedSkills.length}/${jobSkills.length} required skills and ` +
    `${matchedReqs.length}/${jobRequirements.length} requirements. ` +
    `${recommendation} — composite score: ${score}/100.`;

  return { score, summary, strengths, gaps, recommendation };
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

    const rankings = job.applicants
      .filter((a) => a.candidate)
      .map((a) => {
        const { score, summary, strengths, gaps } = scoreCandidate(a.candidate, job);
        return {
          id:       a.candidate._id.toString(),
          name:     a.candidate.fullName || a.candidate.email,
          score,
          summary,
          strengths,
          gaps,
        };
      })
      .sort((a, b) => b.score - a.score);

    for (const rank of rankings) {
      const applicant = job.applicants.find(
        (a) => a.candidate._id.toString() === rank.id
      );
      if (applicant) {
        applicant.aiScore   = rank.score;
        applicant.aiSummary = rank.summary;
        if (rank.score >= 70) applicant.status = "shortlisted";
      }
    }
    await job.save();

    res.json({ success: true, rankings });
  } catch (err) {
    console.error("Rank candidates error:", err);
    res.status(500).json({ success: false, message: "Ranking failed: " + err.message });
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
      .populate("candidate", "fullName email resumeText skills")
      .populate("job", "title company description skills requirements");

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

    // Auto-generate onboarding plan for hire or consider recommendations
    let onboardingGenerated = false;
    if (["hire", "consider"].includes(evaluation.recommendation)) {
      try {
        // Fetch ranking signal from Job applicants array
        const jobDoc = await Job.findOne(
          { _id: interview.job._id, "applicants.candidate": interview.candidate._id },
          { "applicants.$": 1 }
        );
        const aiScore   = jobDoc?.applicants?.[0]?.aiScore   ?? null;
        const aiSummary = jobDoc?.applicants?.[0]?.aiSummary ?? null;

        const onboardingPrompt = `
You are an expert HR onboarding specialist. A candidate has been selected for a role.
Using the provided evaluation signals, generate a personalized onboarding plan and compute their Role Readiness Score.

CANDIDATE: ${candidate.fullName || "Candidate"}
SKILLS: ${candidate.skills?.join(", ") || "Not listed"}
RESUME: ${candidate.resumeText ? candidate.resumeText.slice(0, 1500) : "Not provided"}

POSITION: ${job.title}
COMPANY: ${job.company || "The company"}
REQUIRED SKILLS: ${job.skills?.join(", ") || "Not specified"}
REQUIREMENTS: ${job.requirements?.join(", ") || "Not specified"}
JOB DESCRIPTION: ${job.description}

AI RANKING (candidate score vs all other applicants):
  Peer Score: ${aiScore ?? "Not ranked"}
  Ranking Summary: ${aiSummary ?? "N/A"}

INTERVIEW EVALUATION (already completed — use these scores directly, do not recompute):
  Overall Score:       ${evaluation.overallScore}/100
  Technical Score:     ${evaluation.technicalScore}/100
  Communication Score: ${evaluation.communicationScore}/100
  Confidence Score:    ${evaluation.confidenceScore}/100
  Evaluator Notes:     ${evaluation.summary}
  Recommendation:      ${evaluation.recommendation.toUpperCase()}

Compute roleReadiness (0-100) by synthesizing resume-to-job skills fit, ranking score vs peers, and interview scores.

Return ONLY valid JSON (no markdown):
{
  "roleReadiness": <0-100>,
  "welcomeMessage": "<2-sentence personalized welcome referencing their specific role>",
  "day1Checklist": ["item1", "item2", "item3", "item4", "item5"],
  "week1Goals": ["goal1", "goal2", "goal3"],
  "day30Goals": ["goal1", "goal2", "goal3"],
  "day60Goals": ["goal1", "goal2", "goal3"],
  "day90Goals": ["goal1", "goal2", "goal3"],
  "skillsToLearn": [
    { "skill": "<skill name>", "resource": "<url or resource name>", "priority": "<high|medium|low>" }
  ],
  "strengths": ["strength1", "strength2"],
  "areasToGrow": ["area1", "area2"],
  "teamIntegrationTips": ["tip1", "tip2", "tip3"]
}
`;

        const onboardingResult = await model.generateContent(onboardingPrompt);
        const onboardingText   = onboardingResult.response.text().replace(/```json|```/g, "").trim();
        const plan             = JSON.parse(onboardingText);

        // Attach explainability metadata — built from known signals, not from Gemini
        plan.onboardingMeta = {
          rankingScore:      aiScore,
          interviewScore:    evaluation.overallScore,
          technicalScore:    evaluation.technicalScore,
          communicationScore: evaluation.communicationScore,
          confidenceScore:   evaluation.confidenceScore,
          recommendation:    evaluation.recommendation,
        };

        await User.findByIdAndUpdate(interview.candidate._id, {
          onboardingPlan:        plan,
          onboardingJobId:       interview.job._id,
          onboardingGeneratedAt: new Date(),
          roleReadinessScore:    plan.roleReadiness,
        });

        onboardingGenerated = true;
      } catch (onboardingErr) {
        console.error("Onboarding generation error (non-fatal):", onboardingErr.message);
      }
    }

    res.json({ success: true, evaluation, onboardingGenerated });
  } catch (err) {
    console.error("Interview evaluation error:", err);
    res.status(500).json({ success: false, message: "Evaluation failed: " + err.message });
  }
};