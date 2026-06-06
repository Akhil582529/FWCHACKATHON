// ── Skill dictionary ─────────────────────────────────────────────────────────
// Add or remove terms here to tune skill extraction across the platform.
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

// ── Regex patterns ────────────────────────────────────────────────────────────
const EMAIL_RE = /[\w.+\-]+@[\w.\-]+\.[a-z]{2,}/i;

const PHONE_RE =
  /(?:\+?\d{1,3}[\s\-.])?(?:\(?\d{3}\)?[\s\-.])\d{3}[\s\-.]?\d{4}/;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the first email address found in text.
 * @param {string} text
 * @returns {string|null}
 */
const extractEmail = (text) => {
  const match = text.match(EMAIL_RE);
  return match ? match[0].toLowerCase() : null;
};

/**
 * Extract the first phone number found in text.
 * @param {string} text
 * @returns {string|null}
 */
const extractPhone = (text) => {
  const match = text.match(PHONE_RE);
  return match ? match[0].trim() : null;
};

/**
 * Heuristic name extraction:
 * Scans the first 10 non-empty lines for a short line (2–5 words, no digits,
 * no email/url) that looks like a person's name.
 * Falls back to the filename stem passed by the caller if nothing matches.
 *
 * @param {string} text
 * @param {string} [filenameStem]
 * @returns {string|null}
 */
const extractName = (text, filenameStem = null) => {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 10);

  for (const line of lines) {
    const words = line.split(/\s+/);
    if (
      words.length >= 2 &&
      words.length <= 5 &&
      !/\d/.test(line) &&
      !/@/.test(line) &&
      !/http/i.test(line) &&
      !/[|\/\\:;,]/.test(line)
    ) {
      return line;
    }
  }

  return filenameStem || null;
};

/**
 * Extract skills by matching the text against SKILL_DICTIONARY.
 * Case-insensitive, whole-word boundary match.
 *
 * @param {string} text
 * @param {string[]} [dictionary]
 * @returns {string[]}
 */
const extractSkills = (text, dictionary = SKILL_DICTIONARY) => {
  const lower = text.toLowerCase();
  return dictionary.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`, "i").test(lower);
  });
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Parse a resume text string into structured fields.
 *
 * @param {string} text              - Raw text from pdfExtractor
 * @param {string} [filenameStem]    - Filename without extension, used as name fallback
 * @param {string[]} [skillDictionary] - Override the default skill list
 * @returns {{ name: string|null, email: string|null, phone: string|null, skills: string[] }}
 */
export const parseResume = (text, filenameStem = null, skillDictionary = SKILL_DICTIONARY) => {
  if (!text) {
    return { name: filenameStem || null, email: null, phone: null, skills: [] };
  }

  return {
    name:   extractName(text, filenameStem),
    email:  extractEmail(text),
    phone:  extractPhone(text),
    skills: extractSkills(text, skillDictionary),
  };
};
