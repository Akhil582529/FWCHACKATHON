// Scoring breakdown: Skill Match 40 | Requirement Match 30 | Completeness 15 | Keyword Relevance 15

const STOPWORDS = new Set([
  "with", "that", "this", "have", "will", "from", "they", "been", "their",
  "would", "about", "into", "through", "during", "before", "after", "above",
  "below", "between", "each", "other", "should", "must", "able", "work",
  "team", "experience", "candidate", "required", "skills", "knowledge",
]);

/**
 * Score a single candidate against a job definition.
 *
 * @param {Object} candidate
 * @param {string[]} candidate.skills
 * @param {string}   candidate.resumeText
 * @param {string}   candidate.resumeUrl
 * @param {string}   candidate.fullName     - or candidate.name for bulk screening path
 *
 * @param {Object} job
 * @param {string[]} job.skills
 * @param {string[]} job.requirements
 * @param {string}   job.description
 *
 * @returns {{
 *   score: number,
 *   breakdown: { skillMatch: number, requirementMatch: number, completeness: number, keywordRelevance: number },
 *   summary: string,
 *   strengths: string[],
 *   gaps: string[],
 *   recommendation: string
 * }}
 */
export const scoreCandidate = (candidate, job) => {
  const jobSkills       = (job.skills        || []).map((s) => s.toLowerCase().trim());
  const jobRequirements =  job.requirements  || [];
  const jobDescription  = (job.description  || "").toLowerCase();
  const candidateSkills = (candidate.skills  || []).map((s) => s.toLowerCase().trim());
  const resumeText      = (candidate.resumeText || "").toLowerCase();
  const hasName         = !!(candidate.fullName || candidate.name);
  const hasResumeUrl    = !!candidate.resumeUrl;

  // 1. Skill Match (0–40)
  const matchedSkills = jobSkills.filter((s) => candidateSkills.includes(s));
  const missingSkills = jobSkills.filter((s) => !candidateSkills.includes(s));
  const skillMatch    = jobSkills.length > 0
    ? Math.round((matchedSkills.length / jobSkills.length) * 40)
    : 20;

  // 2. Requirement Match (0–30)
  const matchedReqs      = jobRequirements.filter((req) => {
    const words = req.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    return words.length > 0 && words.some((w) => resumeText.includes(w));
  });
  const requirementMatch = jobRequirements.length > 0
    ? Math.round((matchedReqs.length / jobRequirements.length) * 30)
    : 15;

  // 3. Resume Completeness (0–15)
  let completeness = 0;
  if (resumeText.length > 200)     completeness += 10;
  else if (resumeText.length > 50) completeness += 5;
  if (hasResumeUrl)                completeness += 3;
  if (hasName)                     completeness += 2;
  completeness = Math.min(15, completeness);

  // 4. Keyword Relevance (0–15)
  const jobKeywords      = [
    ...new Set(jobDescription.split(/\W+/).filter((w) => w.length > 4 && !STOPWORDS.has(w))),
  ];
  const matchedKeywords  = jobKeywords.filter((kw) => resumeText.includes(kw));
  const keywordRelevance = jobKeywords.length > 0
    ? Math.round((matchedKeywords.length / jobKeywords.length) * 15)
    : 7;

  const score = Math.min(100, skillMatch + requirementMatch + completeness + keywordRelevance);

  // Strengths
  const strengths = [
    ...matchedSkills.slice(0, 2).map((s) => `Proficient in ${s}`),
    ...(matchedReqs.length > 0
      ? [`Meets ${matchedReqs.length} of ${jobRequirements.length} listed requirements`]
      : []),
  ];
  if (strengths.length === 0) strengths.push("Profile submitted for review");

  // Gaps
  const gaps = [
    ...missingSkills.slice(0, 2).map((s) => `Missing skill: ${s}`),
    ...(matchedReqs.length < jobRequirements.length
      ? [`${jobRequirements.length - matchedReqs.length} requirement(s) not evidenced in resume`]
      : []),
  ];
  if (gaps.length === 0) gaps.push("No significant gaps identified");

  const recommendation =
    score >= 85 ? "Strong Hire" :
    score >= 70 ? "Hire"        :
    score >= 50 ? "Consider"    : "Reject";

  const summary =
    `Matched ${matchedSkills.length}/${jobSkills.length} required skills and ` +
    `${matchedReqs.length}/${jobRequirements.length} requirements. ` +
    `${recommendation} — composite score: ${score}/100.`;

  return {
    score,
    breakdown: { skillMatch, requirementMatch, completeness, keywordRelevance },
    summary,
    strengths,
    gaps,
    recommendation,
  };
};
