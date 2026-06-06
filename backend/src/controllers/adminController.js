import { GoogleGenerativeAI } from "@google/generative-ai";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Interview from "../models/Interview.js";

// GET /api/admin/users
export const getAllUsers = async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const users = await User.find(filter).select("-passwordHash -adminKeyHash").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/users/:id/toggle — activate/deactivate
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ success: false, message: "Cannot deactivate admin" });

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: `User ${user.isActive ? "activated" : "deactivated"}`, user: user.profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/analytics
export const getAnalytics = async (req, res) => {
  try {
    const [
      totalUsers, candidates, hrUsers, activeJobs, totalJobs,
      totalInterviews, recentUsers, recentJobs,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "candidate" }),
      User.countDocuments({ role: "hr" }),
      Job.countDocuments({ isActive: true }),
      Job.countDocuments(),
      Interview.countDocuments({ isMock: false }),
      User.find().sort({ createdAt: -1 }).limit(5).select("fullName email role createdAt isActive"),
      Job.find().sort({ createdAt: -1 }).limit(5).select("title company isActive createdAt").populate("postedBy", "companyId"),
    ]);

    // Applications count
    const jobsWithApps = await Job.find({}, "applicants");
    const totalApplications = jobsWithApps.reduce((sum, j) => sum + j.applicants.length, 0);

    // Monthly signups (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlySignups = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      success: true,
      analytics: {
        totalUsers, candidates, hrUsers,
        admins: totalUsers - candidates - hrUsers,
        activeJobs, totalJobs, totalInterviews, totalApplications,
        recentUsers, recentJobs, monthlySignups,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/workforce
export const getWorkforceAnalytics = async (req, res) => {
  try {
    const [
      applicantStatusAgg,
      aiRankingAgg,
      interviewScoreAgg,
      recommendationAgg,
      readinessAgg,
      readyToHireCount,
      skillDemandAgg,
      skillSupplyAgg,
      totalInterviews,
      evaluatedInterviews,
      topCandidateDoc,
    ] = await Promise.all([
      Job.aggregate([{ $unwind: "$applicants" }, { $group: { _id: "$applicants.status", count: { $sum: 1 } } }]),
      Job.aggregate([{ $unwind: "$applicants" }, { $match: { "applicants.aiScore": { $ne: null } } }, { $group: { _id: null, avgScore: { $avg: "$applicants.aiScore" }, count: { $sum: 1 } } }]),
      Interview.aggregate([{ $match: { isMock: false, mockScore: { $ne: null } } }, { $group: { _id: null, avgMockScore: { $avg: "$mockScore" }, avgTechnicalScore: { $avg: "$technicalScore" }, avgCommunicationScore: { $avg: "$communicationScore" }, avgConfidenceScore: { $avg: "$confidenceScore" } } }]),
      Interview.aggregate([{ $match: { isMock: false, recommendation: { $ne: null } } }, { $group: { _id: "$recommendation", count: { $sum: 1 } } }]),
      User.aggregate([{ $match: { role: "candidate", roleReadinessScore: { $ne: null } } }, { $group: { _id: null, avg: { $avg: "$roleReadinessScore" } } }]),
      User.countDocuments({ role: "candidate", roleReadinessScore: { $gte: 80 } }),
      Job.aggregate([{ $unwind: "$skills" }, { $group: { _id: "$skills", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      User.aggregate([{ $match: { role: "candidate" } }, { $unwind: "$skills" }, { $group: { _id: "$skills", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Interview.countDocuments({ isMock: false }),
      Interview.countDocuments({ isMock: false, mockScore: { $ne: null } }),
      User.findOne({ role: "candidate", roleReadinessScore: { $ne: null } }, "fullName email roleReadinessScore onboardingPlan").sort({ roleReadinessScore: -1 }),
    ]);

    // Funnel — cumulative counts from non-cumulative statuses
    const statusMap = {};
    applicantStatusAgg.forEach(({ _id, count }) => { if (_id) statusMap[_id] = count; });
    const totalApplied     = Object.values(statusMap).reduce((s, c) => s + c, 0);
    const reviewedCount    = (statusMap.reviewed || 0) + (statusMap.shortlisted || 0) + (statusMap.rejected || 0) + (statusMap.hired || 0);
    const shortlistedCount = (statusMap.shortlisted || 0) + (statusMap.hired || 0);

    // Recommendations
    const recMap = {};
    recommendationAgg.forEach(({ _id, count }) => { if (_id) recMap[_id] = count; });
    const hireCount      = recMap.hire    || 0;
    const totalEvaluated = hireCount + (recMap.consider || 0) + (recMap.pass || 0);

    // Quality metrics
    const avgAIScore             = Math.round(aiRankingAgg[0]?.avgScore              ?? 0);
    const avgInterviewScore      = Math.round(interviewScoreAgg[0]?.avgMockScore      ?? 0);
    const avgTechnicalScore      = Math.round(interviewScoreAgg[0]?.avgTechnicalScore  ?? 0);
    const avgCommunicationScore  = Math.round(interviewScoreAgg[0]?.avgCommunicationScore ?? 0);
    const avgConfidenceScore     = Math.round(interviewScoreAgg[0]?.avgConfidenceScore  ?? 0);
    const avgRoleReadiness       = Math.round(readinessAgg[0]?.avg ?? 0);
    const hireRate               = totalEvaluated > 0 ? Math.round((hireCount / totalEvaluated) * 100) : 0;
    const evalCoverage           = totalInterviews > 0 ? Math.round((evaluatedInterviews / totalInterviews) * 100) : 0;

    // Health Score
    const healthScore = Math.round(
      0.30 * avgAIScore +
      0.30 * avgInterviewScore +
      0.20 * avgRoleReadiness +
      0.20 * hireRate
    );
    const healthLabel = healthScore >= 90 ? "Elite" : healthScore >= 75 ? "Strong" : healthScore >= 60 ? "Moderate" : "At Risk";

    // Skill gap — demand from jobs vs supply from candidates
    const supplyMap = {};
    skillSupplyAgg.forEach(({ _id, count }) => { supplyMap[(_id || "").toLowerCase()] = count; });
    const skillGaps = skillDemandAgg
      .map(({ _id, count: demand }) => ({
        skill: _id,
        demand,
        supply: supplyMap[(_id || "").toLowerCase()] || 0,
        gap: demand - (supplyMap[(_id || "").toLowerCase()] || 0),
      }))
      .sort((a, b) => b.gap - a.gap);

    // Top candidate by role readiness
    const topCandidate = topCandidateDoc ? {
      fullName:           topCandidateDoc.fullName || topCandidateDoc.email,
      roleReadinessScore: topCandidateDoc.roleReadinessScore,
      recommendation:     topCandidateDoc.onboardingPlan?.onboardingMeta?.recommendation || null,
      aiScore:            topCandidateDoc.onboardingPlan?.onboardingMeta?.rankingScore    || null,
    } : null;

    res.json({
      success: true,
      workforce: {
        healthScore,
        healthLabel,
        kpi: {
          readyToHire:   readyToHireCount,
          hireRate,
          avgAIScore,
          avgInterviewScore,
          avgRoleReadiness,
          evalCoverage,
          aiRankedCount: aiRankingAgg[0]?.count || 0,
        },
        funnel: {
          applied:         totalApplied,
          reviewed:        reviewedCount,
          shortlisted:     shortlistedCount,
          aiRanked:        aiRankingAgg[0]?.count || 0,
          interviewed:     totalInterviews,
          evaluated:       evaluatedInterviews,
          hireRecommended: hireCount,
        },
        quality: {
          avgInterviewScore,
          avgTechnicalScore,
          avgCommunicationScore,
          avgConfidenceScore,
          avgRoleReadiness,
          avgAIScore,
        },
        skillGaps,
        topCandidate,
      },
    });
  } catch (err) {
    console.error("Workforce analytics error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/ai-insights
export const getAIInsights = async (req, res) => {
  try {
    const { metrics } = req.body;
    if (!metrics) return res.status(400).json({ success: false, message: "metrics required" });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const { healthScore, healthLabel, kpi, funnel, quality, skillGaps } = metrics;
    const topGaps = (skillGaps || [])
      .filter(g => g.gap > 0)
      .slice(0, 3)
      .map(g => `${g.skill}: ${g.demand} jobs need it, ${g.supply} candidates have it (gap: ${g.gap})`)
      .join("\n") || "No significant gaps identified";

    const prompt = `You are a Chief People Officer reviewing workforce analytics data.

PLATFORM HEALTH SCORE: ${healthScore}/100 (${healthLabel})

HIRING FUNNEL:
  Total Applications:   ${funnel?.applied ?? 0}
  Reviewed:             ${funnel?.reviewed ?? 0}
  Shortlisted:          ${funnel?.shortlisted ?? 0}
  AI Ranked:            ${funnel?.aiRanked ?? 0}
  Interviewed:          ${funnel?.interviewed ?? 0}
  AI Evaluated:         ${funnel?.evaluated ?? 0}
  Hire Recommended:     ${funnel?.hireRecommended ?? 0}

AI QUALITY METRICS:
  Avg AI Ranking Score:    ${quality?.avgAIScore ?? 0}/100
  Avg Interview Score:     ${quality?.avgInterviewScore ?? 0}/100
  Avg Technical Score:     ${quality?.avgTechnicalScore ?? 0}/100
  Avg Communication Score: ${quality?.avgCommunicationScore ?? 0}/100
  Avg Confidence Score:    ${quality?.avgConfidenceScore ?? 0}/100
  Avg Role Readiness:      ${quality?.avgRoleReadiness ?? 0}/100
  Hire Rate:               ${kpi?.hireRate ?? 0}%
  Ready To Hire:           ${kpi?.readyToHire ?? 0} candidates
  Evaluation Coverage:     ${kpi?.evalCoverage ?? 0}%

TOP SKILL GAPS:
${topGaps}

Generate an executive workforce intelligence report. Return ONLY valid JSON (no markdown fences):
{
  "overallHealth": "Elite | Strong | Moderate | At Risk",
  "summary": "<2-3 sentence executive narrative>",
  "strengths": ["specific data-driven strength", "second strength"],
  "risks": ["specific risk or bottleneck", "second risk"],
  "recommendations": ["actionable recommendation", "second recommendation", "third recommendation"]
}`;

    const result = await model.generateContent(prompt);
    const text   = result.response.text().replace(/```json|```/g, "").trim();
    const report = JSON.parse(text);

    res.json({ success: true, report });
  } catch (err) {
    console.error("AI insights error:", err);
    res.status(500).json({ success: false, message: "AI report failed: " + err.message });
  }
};