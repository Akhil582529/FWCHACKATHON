import {
  INDUSTRY_KEYWORDS,
  LEADERSHIP_STRONG,
  LEADERSHIP_WEAK,
} from "./resumeParser.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can",
  "had", "her", "was", "one", "our", "out", "get", "has", "him", "his",
  "how", "its", "may", "new", "now", "old", "see", "two", "who", "did",
  "with", "that", "this", "from", "they", "have", "been", "will", "more",
  "when", "what", "also", "into", "than", "then", "them", "some", "could",
  "about", "their", "which", "would", "there", "other", "after", "first",
  "years", "experience", "skills", "ability", "strong", "work", "team",
  "required", "knowledge", "candidate", "using", "must", "able", "good",
]);

const MOOC_PLATFORMS = [
  "coursera", "udemy", "edx", "pluralsight", "linkedin learning",
  "codecademy", "udacity", "self-taught", "online course", "bootcamp",
];

const SKILL_DOMAINS = {
  frontend:  ["react", "vue", "angular", "next.js", "svelte", "html", "css", "tailwind"],
  backend:   ["node.js", "express", "django", "flask", "fastapi", "spring", "rails", "nestjs"],
  cloud:     ["aws", "azure", "gcp", "docker", "kubernetes", "terraform"],
  data:      ["machine learning", "tensorflow", "pytorch", "pandas", "spark", "hadoop"],
  mobile:    ["react native", "flutter", "android", "ios"],
  databases: ["mongodb", "postgresql", "mysql", "redis", "elasticsearch"],
};

// Factor metadata — used for strengths/gaps derivation
const FACTOR_META = [
  { key: "skillMatch",             max: 15, label: "Technical skills match" },
  { key: "relevantExperience",     max: 12, label: "Relevant experience" },
  { key: "educationQualification", max:  8, label: "Education qualification" },
  { key: "certifications",         max:  5, label: "Professional certifications" },
  { key: "industryExperience",     max:  7, label: "Industry experience" },
  { key: "projectExperience",      max:  8, label: "Project portfolio" },
  { key: "technicalCompetency",    max: 10, label: "Technical breadth" },
  { key: "domainKnowledge",        max:  7, label: "Domain knowledge" },
  { key: "roleRelevance",          max:  8, label: "Role relevance" },
  { key: "achievementsImpact",     max:  5, label: "Achievements & impact" },
  { key: "careerStability",        max:  4, label: "Career stability" },
  { key: "communicationQuality",   max:  4, label: "Communication quality" },
  { key: "leadershipExperience",   max:  4, label: "Leadership experience" },
  { key: "learningAgility",        max:  3, label: "Learning agility" },
];

// ── Individual factor scorers ─────────────────────────────────────────────────

// Factor 1 — Skill Match (0–15)
const scoreSkillMatch = (candidate, job) => {
  const jobSkills = (job.skills || []).map((s) => s.toLowerCase().trim());
  if (jobSkills.length === 0) return 7; // neutral when job has no skills listed
  const candidateSkills = (candidate.skills || []).map((s) => s.toLowerCase().trim());
  const matched = jobSkills.filter((s) => candidateSkills.includes(s));
  return Math.round((matched.length / jobSkills.length) * 15);
};

// Factor 2 — Relevant Experience (0–12)
const scoreRelevantExperience = (candidate, job) => {
  const candidateYears = candidate.extractedExperienceYears;
  const reqMatch = (job.description || "").match(
    /(\d+)\+?\s*years?\s+(?:of\s+)?(?:professional\s+)?experience/i
  );
  const requiredYears = reqMatch ? parseInt(reqMatch[1]) : null;

  if (candidateYears === null) return 4; // no years info → below-neutral default
  if (requiredYears === null) {
    if (candidateYears >= 7) return 12;
    if (candidateYears >= 4) return 9;
    if (candidateYears >= 2) return 6;
    return 3;
  }
  const ratio = candidateYears / requiredYears;
  if (ratio >= 1.5) return 12;
  if (ratio >= 1.0) return 10;
  if (ratio >= 0.75) return 7;
  if (ratio >= 0.5)  return 4;
  return 1;
};

// Factor 3 — Education Qualification (0–8)
const scoreEducationQualification = (candidate) => {
  const tiers = { phd: 8, masters: 6, bachelors: 4, diploma: 2, unknown: 1 };
  return tiers[candidate.extractedEducation] ?? 1;
};

// Factor 4 — Certifications (0–5)
const scoreCertifications = (candidate) => {
  const count = (candidate.extractedCertifications || []).length;
  if (count === 0) return 0;
  if (count === 1) return 2;
  if (count === 2) return 3;
  return 5;
};

// Factor 5 — Industry Experience (0–7)
const scoreIndustryExperience = (candidate, job) => {
  const jobDesc = (job.description || "").toLowerCase();
  const jobIndustries = INDUSTRY_KEYWORDS.filter((ind) => jobDesc.includes(ind));
  if (jobIndustries.length === 0) return 3; // neutral — job has no industry signals
  const candidateIndustries = candidate.extractedIndustries || [];
  const matched = jobIndustries.filter((ind) => candidateIndustries.includes(ind));
  return Math.round((matched.length / jobIndustries.length) * 7);
};

// Factor 6 — Project Experience (0–8)
const scoreProjectExperience = (candidate) => {
  const count = candidate.projectCount || 0;
  if (count === 0) return 0;
  if (count <= 2)  return 4;
  if (count <= 5)  return 6;
  return 8;
};

// Factor 7 — Technical Competency (0–10)
const scoreTechnicalCompetency = (candidate) => {
  const count = (candidate.skills || []).length;
  if (count === 0)  return 0;
  if (count <= 3)   return 3;
  if (count <= 6)   return 6;
  if (count <= 9)   return 8;
  return 10;
};

// Factor 8 — Domain Knowledge (0–7)
const scoreDomainKnowledge = (candidate, job) => {
  const jobWords = (job.description || "")
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4 && !STOPWORDS.has(w));
  const unique = [...new Set(jobWords)];
  if (unique.length === 0) return 3;
  const resumeLower = (candidate.resumeText || "").toLowerCase();
  const matched = unique.filter((kw) => resumeLower.includes(kw));
  return Math.min(7, Math.round((matched.length / unique.length) * 7));
};

// Factor 9 — Role Relevance (0–8)
const scoreRoleRelevance = (candidate, job) => {
  const titleWords = (job.title || job.jobTitle || "")
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  if (titleWords.length === 0) return 4; // neutral
  const candidateTitles = (candidate.extractedTitles || []).map((t) => t.toLowerCase());
  const resumeLower = (candidate.resumeText || "").toLowerCase();
  const matched = titleWords.filter(
    (w) => candidateTitles.some((t) => t.includes(w)) || resumeLower.includes(w)
  );
  return Math.round((matched.length / titleWords.length) * 8);
};

// Factor 10 — Achievements & Impact (0–5)
const scoreAchievementsImpact = (candidate) => {
  const count = candidate.achievementCount || 0;
  if (count === 0) return 0;
  if (count <= 2)  return 2;
  if (count <= 4)  return 3;
  return 5;
};

// Factor 11 — Career Stability (0–4)
const scoreCareerStability = (candidate) => {
  const years = candidate.extractedExperienceYears;
  const jobs  = candidate.estimatedJobCount || 0;
  if (!years || jobs === 0) return 2; // insufficient data → neutral
  const avgTenure = years / jobs;
  if (avgTenure >= 2) return 4;
  if (avgTenure >= 1) return 2;
  return 0;
};

// Factor 12 — Communication Quality (0–4)
const scoreCommunicationQuality = (candidate) => {
  const text = candidate.resumeText || "";
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const wordScore = wordCount >= 300 && wordCount <= 1200 ? 2 : 1;

  const lower = text.toLowerCase();
  const sections = ["experience", "education", "skills", "projects", "summary", "certifications"];
  const sectionCount = sections.filter((s) => lower.includes(s)).length;
  const sectionScore = sectionCount >= 4 ? 2 : sectionCount >= 2 ? 1 : 0;

  return Math.min(4, wordScore + sectionScore);
};

// Factor 13 — Leadership Experience (0–4)
const scoreLeadershipExperience = (candidate) => {
  const lower = (candidate.resumeText || "").toLowerCase();
  if (LEADERSHIP_STRONG.some((kw) => lower.includes(kw))) return 4;
  if (LEADERSHIP_WEAK.some((kw)   => lower.includes(kw))) return 2;
  return 0;
};

// Factor 14 — Learning Agility (0–3)
const scoreLearningAgility = (candidate) => {
  const candidateSkills = (candidate.skills || []).map((s) => s.toLowerCase());
  const domainsPresent = Object.values(SKILL_DOMAINS).filter(
    (domainSkills) => domainSkills.some((s) => candidateSkills.includes(s))
  ).length;
  const resumeLower = (candidate.resumeText || "").toLowerCase();
  const hasCourses = MOOC_PLATFORMS.some((kw) => resumeLower.includes(kw));

  if (domainsPresent >= 3 && hasCourses) return 3;
  if (domainsPresent >= 3 || (domainsPresent >= 2 && hasCourses)) return 2;
  if (domainsPresent >= 1 || hasCourses) return 1;
  return 0;
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Score a single candidate against a job definition using 14 factors (100 pts total).
 *
 * Breakdown groupings stored by the current controller:
 *   skillMatch       (0–15)  = factor 1
 *   requirementMatch (0–20)  = factors 2 + 9  (experience + role relevance)
 *   completeness     (0–21)  = factors 3+4+12+11 (edu + certs + comms + stability)
 *   keywordRelevance (0–44)  = factors 5–8+10+13+14 (all remaining)
 *
 * @param {Object} candidate - output of parseResume() spread with resumeText
 * @param {Object} job       - { skills, requirements, description, title }
 * @returns {{ score, breakdown, summary, strengths, gaps, recommendation }}
 */
export const scoreCandidate = (candidate, job) => {
  const f = {
    skillMatch:             scoreSkillMatch(candidate, job),
    relevantExperience:     scoreRelevantExperience(candidate, job),
    educationQualification: scoreEducationQualification(candidate),
    certifications:         scoreCertifications(candidate),
    industryExperience:     scoreIndustryExperience(candidate, job),
    projectExperience:      scoreProjectExperience(candidate),
    technicalCompetency:    scoreTechnicalCompetency(candidate),
    domainKnowledge:        scoreDomainKnowledge(candidate, job),
    roleRelevance:          scoreRoleRelevance(candidate, job),
    achievementsImpact:     scoreAchievementsImpact(candidate),
    careerStability:        scoreCareerStability(candidate),
    communicationQuality:   scoreCommunicationQuality(candidate),
    leadershipExperience:   scoreLeadershipExperience(candidate),
    learningAgility:        scoreLearningAgility(candidate),
  };

  const score = Math.min(100,
    f.skillMatch + f.relevantExperience + f.educationQualification + f.certifications +
    f.industryExperience + f.projectExperience + f.technicalCompetency + f.domainKnowledge +
    f.roleRelevance + f.achievementsImpact + f.careerStability + f.communicationQuality +
    f.leadershipExperience + f.learningAgility
  );

  // Grouped keys used by the controller (sum of component factors, same 100-pt total)
  const grouped = {
    skillMatch:       f.skillMatch,
    requirementMatch: f.relevantExperience + f.roleRelevance,
    completeness:     f.educationQualification + f.certifications + f.communicationQuality + f.careerStability,
    keywordRelevance: f.industryExperience + f.projectExperience + f.technicalCompetency +
                      f.domainKnowledge + f.achievementsImpact + f.leadershipExperience + f.learningAgility,
  };

  // Spread individual keys after grouped so named factors remain accessible
  const breakdown = { ...grouped, ...f };

  const strengths = FACTOR_META
    .filter((m) => f[m.key] / m.max >= 0.70)
    .sort((a, b) => f[b.key] / b.max - f[a.key] / a.max)
    .slice(0, 3)
    .map((m) => `${m.label} (${f[m.key]}/${m.max})`);
  if (strengths.length === 0) strengths.push("Profile submitted for review");

  // Only flag gaps on factors that carry meaningful weight (max ≥ 5)
  const gaps = FACTOR_META
    .filter((m) => m.max >= 5 && f[m.key] / m.max < 0.35)
    .sort((a, b) => f[a.key] / a.max - f[b.key] / b.max)
    .slice(0, 3)
    .map((m) => `Low ${m.label.toLowerCase()} (${f[m.key]}/${m.max})`);
  if (gaps.length === 0) gaps.push("No significant gaps identified");

  const recommendation =
    score >= 85 ? "Strong Hire" :
    score >= 70 ? "Hire"        :
    score >= 50 ? "Consider"    : "Reject";

  const summary =
    `${recommendation} — composite score ${score}/100 across 14 factors. ` +
    `Skills ${f.skillMatch}/15, Experience ${f.relevantExperience}/12, ` +
    `Education ${f.educationQualification}/8, Technical ${f.technicalCompetency}/10.`;

  return { score, breakdown, summary, strengths, gaps, recommendation };
};
