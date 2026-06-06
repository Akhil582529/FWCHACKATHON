// ── Skill dictionary ──────────────────────────────────────────────────────────
export const SKILL_DICTIONARY = [
  // Languages
  "javascript", "typescript", "python", "java", "c", "c++", "c#", "go", "rust",
  "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "perl", "bash",
  // Frontend
  "react", "vue", "angular", "next.js", "nuxt", "svelte", "html", "css",
  "sass", "tailwind", "bootstrap", "webpack", "vite", "redux",
  // Backend
  "node.js", "express", "fastapi", "django", "flask", "spring", "rails",
  "laravel", "nestjs", "graphql", "rest", "rest api", "grpc",
  // Databases
  "mongodb", "postgresql", "mysql", "sqlite", "redis", "elasticsearch",
  "cassandra", "dynamodb", "firebase", "supabase",
  // Cloud & DevOps
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible",
  "jenkins", "github actions", "ci/cd", "linux", "nginx",
  // Data & AI
  "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn",
  "pandas", "numpy", "spark", "hadoop", "tableau", "power bi",
  // Mobile
  "react native", "flutter", "android", "ios", "xcode",
  // Other
  "git", "agile", "scrum", "jira", "figma", "photoshop",
];

// ── Exported dictionaries (imported by bulkScorer) ────────────────────────────
export const INDUSTRY_KEYWORDS = [
  "fintech", "banking", "finance", "healthcare", "medical", "pharma",
  "e-commerce", "retail", "saas", "enterprise", "startup",
  "telecom", "telecommunications", "edtech", "logistics", "supply chain",
  "manufacturing", "insurance", "real estate", "media", "gaming",
  "cybersecurity", "blockchain", "cryptocurrency", "automotive",
];

export const LEADERSHIP_STRONG = [
  "team lead", "tech lead", "engineering lead", "engineering manager",
  "head of engineering", "head of", "director of", "vp of", "vice president",
  "cto", "coo", "ceo", "co-founder", "founder", "principal engineer",
];

export const LEADERSHIP_WEAK = [
  "led a team", "managed a team", "supervised", "mentored", "oversaw",
  "team of", "guided the", "coached", "managed junior", "onboarded",
];

// ── Education levels (highest first) ─────────────────────────────────────────
const EDUCATION_LEVELS = [
  { level: "phd",       keywords: ["phd", "ph.d", "doctorate", "doctoral"] },
  { level: "masters",   keywords: ["master's", "masters degree", "master of", "m.tech", "mba", "m.sc", "m.s.", "m.e.", "postgraduate", "post-graduate"] },
  { level: "bachelors", keywords: ["bachelor", "b.tech", "b.e.", "b.sc", "b.s.", "b.a.", "b.eng", "undergraduate"] },
  { level: "diploma",   keywords: ["diploma", "associate degree", "higher secondary", "hsc", "polytechnic"] },
];

// ── Certification keywords ────────────────────────────────────────────────────
const CERTIFICATION_KEYWORDS = [
  "aws certified", "google cloud certified", "azure certified", "gcp professional",
  "pmp", "prince2", "csm", "scrum master", "safe certified",
  "cissp", "ceh", "comptia security", "security+", "cisa",
  "cfa", "cpa", "tableau certified", "google analytics certified",
  "oracle certified", "cisco certified", "ccna", "ccnp",
  "itil", "six sigma", "lean six sigma", "google professional certificate",
];

// ── Project action verbs ──────────────────────────────────────────────────────
const PROJECT_VERBS = [
  "built", "developed", "implemented", "deployed", "launched",
  "created", "designed", "architected", "engineered", "shipped",
  "delivered", "constructed", "established", "produced", "automated",
];

// ── Impact verbs (achievements) ───────────────────────────────────────────────
const IMPACT_VERBS = [
  "reduced", "improved", "increased", "grew", "saved",
  "optimized", "accelerated", "achieved", "boosted", "enhanced",
  "streamlined", "transformed", "generated", "exceeded", "cut",
];

// ── Job title keywords ────────────────────────────────────────────────────────
const TITLE_KEYWORDS = [
  "developer", "engineer", "architect", "analyst", "designer",
  "scientist", "consultant", "manager", "lead", "intern",
  "specialist", "administrator", "programmer", "tester",
  "devops", "fullstack", "full stack", "frontend", "backend",
];

// ── Regex patterns ────────────────────────────────────────────────────────────
const EMAIL_RE  = /[\w.+\-]+@[\w.\-]+\.[a-z]{2,}/i;
const PHONE_RE  = /(?:\+?\d{1,3}[\s\-.])?(?:\(?\d{3}\)?[\s\-.])\d{3}[\s\-.]?\d{4}/;

// ── Helpers ───────────────────────────────────────────────────────────────────
const extractEmail = (text) => {
  const match = text.match(EMAIL_RE);
  return match ? match[0].toLowerCase() : null;
};

const extractPhone = (text) => {
  const match = text.match(PHONE_RE);
  return match ? match[0].trim() : null;
};

const extractName = (text, filenameStem = null) => {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 10);
  for (const line of lines) {
    const words = line.split(/\s+/);
    if (
      words.length >= 2 && words.length <= 5 &&
      !/\d/.test(line) && !/@/.test(line) &&
      !/http/i.test(line) && !/[|\/\\:;,]/.test(line)
    ) return line;
  }
  return filenameStem || null;
};

const extractSkills = (text, dictionary = SKILL_DICTIONARY) => {
  const lower = text.toLowerCase();
  return dictionary.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`, "i").test(lower);
  });
};

// ── New extraction functions ──────────────────────────────────────────────────

const extractExperienceYears = (text) => {
  const patterns = [
    /(\d+)\+?\s*years?\s+of\s+(?:professional\s+)?experience/gi,
    /(\d+)\+?\s*yrs?\s+of\s+(?:professional\s+)?experience/gi,
    /experience\s+of\s+(\d+)\+?\s*years?/gi,
    /(\d+)\+?\s*years?\s+(?:professional|industry|work)\s+experience/gi,
  ];
  let max = null;
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const y = parseInt(m[1]);
      if (y > 0 && y < 50 && (max === null || y > max)) max = y;
    }
  }
  return max;
};

const extractEducation = (text) => {
  const lower = text.toLowerCase();
  for (const { level, keywords } of EDUCATION_LEVELS) {
    if (keywords.some((kw) => lower.includes(kw))) return level;
  }
  return "unknown";
};

const extractCertifications = (text) => {
  const lower = text.toLowerCase();
  return CERTIFICATION_KEYWORDS.filter((cert) => lower.includes(cert));
};

const extractIndustries = (text) => {
  const lower = text.toLowerCase();
  return INDUSTRY_KEYWORDS.filter((ind) => lower.includes(ind));
};

const extractTitles = (text) => {
  const lower = text.toLowerCase();
  return TITLE_KEYWORDS.filter((title) => {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![\\w])${escaped}(?![\\w])`, "i").test(lower);
  });
};

const extractProjectCount = (text) => {
  const lower = text.toLowerCase();
  return lower.split(/[.\n!]+/).filter((s) =>
    PROJECT_VERBS.some((v) => s.includes(v))
  ).length;
};

const extractAchievementCount = (text) => {
  const lower = text.toLowerCase();
  return lower.split(/[.\n!]+/).filter((s) =>
    IMPACT_VERBS.some((v) => s.includes(v)) && /\d/.test(s)
  ).length;
};

const extractJobCount = (text) => {
  const re = /\b(?:inc|ltd|llc|corp|pvt|limited|technologies|solutions|systems|consulting|services)\b/gi;
  return Math.max(0, (text.match(re) || []).length);
};

const extractLeadership = (text) => {
  const lower = text.toLowerCase();
  return (
    LEADERSHIP_STRONG.some((kw) => lower.includes(kw)) ||
    LEADERSHIP_WEAK.some((kw) => lower.includes(kw))
  );
};

// ── Main export ───────────────────────────────────────────────────────────────
export const parseResume = (text, filenameStem = null, skillDictionary = SKILL_DICTIONARY) => {
  if (!text) {
    return {
      name: filenameStem || null, email: null, phone: null, skills: [],
      extractedExperienceYears: null, extractedEducation: "unknown",
      extractedCertifications: [], extractedIndustries: [], extractedTitles: [],
      projectCount: 0, achievementCount: 0, estimatedJobCount: 0, hasLeadership: false,
    };
  }
  return {
    name:   extractName(text, filenameStem),
    email:  extractEmail(text),
    phone:  extractPhone(text),
    skills: extractSkills(text, skillDictionary),
    extractedExperienceYears: extractExperienceYears(text),
    extractedEducation:       extractEducation(text),
    extractedCertifications:  extractCertifications(text),
    extractedIndustries:      extractIndustries(text),
    extractedTitles:          extractTitles(text),
    projectCount:             extractProjectCount(text),
    achievementCount:         extractAchievementCount(text),
    estimatedJobCount:        extractJobCount(text),
    hasLeadership:            extractLeadership(text),
  };
};
