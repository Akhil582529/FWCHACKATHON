/**
 * Pipeline test script — run from the backend/ directory:
 *   node src/check.mjs <path-to-resume.pdf>
 *
 * If no path is supplied it looks for sample-resume.pdf in backend/.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { extractPdfText } from "./utils/pdfExtractor.js";
import { parseResume }    from "./utils/resumeParser.js";
import { scoreCandidate } from "./utils/bulkScorer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Mock job ──────────────────────────────────────────────────────────────────
const MOCK_JOB = {
  title:        "React Developer",
  skills:       ["react", "javascript", "node.js", "mongodb"],
  requirements: ["rest apis", "git", "team collaboration"],
  description:
    "We are looking for a React Developer experienced in building modern web " +
    "applications with JavaScript and Node.js. You will work with REST APIs, " +
    "MongoDB, and collaborate with a cross-functional team using Git.",
};

// ── Resolve PDF path ──────────────────────────────────────────────────────────
const pdfArg    = process.argv[2];
const pdfPath   = pdfArg
  ? path.resolve(pdfArg)
  : path.resolve(__dirname, "..", "sample-resume.pdf");

if (!fs.existsSync(pdfPath)) {
  console.error(`\n❌ PDF not found: ${pdfPath}`);
  console.error("   Usage: node src/check.mjs <path-to-resume.pdf>\n");
  process.exit(1);
}

const filenameStem = path.basename(pdfPath, ".pdf");

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  Bulk Screening Pipeline — Test Run");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  PDF       : ${pdfPath}`);
console.log(`  Mock Job  : ${MOCK_JOB.title}\n`);

// ── Step 1: Extract PDF text ──────────────────────────────────────────────────
console.log("▶ Step 1 — extractPdfText()");
const buffer    = fs.readFileSync(pdfPath);
const resumeText = await extractPdfText(buffer);

if (!resumeText) {
  console.error("  ❌ PDF extraction failed — corrupt, empty, or password-protected.");
  process.exit(1);
}
console.log(`  ✅ Extracted ${resumeText.length} characters`);
console.log(`  Preview   : ${resumeText.slice(0, 120).replace(/\n/g, " ")}…\n`);

// ── Step 2: Parse resume fields ───────────────────────────────────────────────
console.log("▶ Step 2 — parseResume()");
const parsed = parseResume(resumeText, filenameStem);
console.log(`  ✅ Parsed`);
console.log(`  Name      : ${parsed.name  ?? "(not detected)"}`);
console.log(`  Email     : ${parsed.email ?? "(not detected)"}`);
console.log(`  Phone     : ${parsed.phone ?? "(not detected)"}`);
console.log(`  Skills    : ${parsed.skills.length > 0 ? parsed.skills.join(", ") : "(none matched)"}\n`);

// ── Step 3: Score candidate ───────────────────────────────────────────────────
console.log("▶ Step 3 — scoreCandidate()");
const candidate = {
  name:       parsed.name,
  fullName:   parsed.name,
  email:      parsed.email,
  skills:     parsed.skills,
  resumeText,
  resumeUrl:  null,
};
const result = scoreCandidate(candidate, MOCK_JOB);
console.log(`  ✅ Scored`);

// ── Results ───────────────────────────────────────────────────────────────────
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  RESULTS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  Candidate     : ${parsed.name  ?? "(unknown)"}`);
console.log(`  Email         : ${parsed.email ?? "(unknown)"}`);
console.log(`  Phone         : ${parsed.phone ?? "(unknown)"}`);
console.log(`  Skills        : ${parsed.skills.join(", ") || "(none)"}`);
console.log(`  Score         : ${result.score}/100`);
console.log(`  Recommendation: ${result.recommendation}`);
console.log(`  Summary       : ${result.summary}`);
console.log("\n  Score Breakdown:");
console.log(`    Skill Match        : ${result.breakdown.skillMatch}/40`);
console.log(`    Requirement Match  : ${result.breakdown.requirementMatch}/30`);
console.log(`    Completeness       : ${result.breakdown.completeness}/15`);
console.log(`    Keyword Relevance  : ${result.breakdown.keywordRelevance}/15`);
console.log("\n  Strengths:");
result.strengths.forEach((s) => console.log(`    + ${s}`));
console.log("\n  Gaps:");
result.gaps.forEach((g) => console.log(`    - ${g}`));
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
