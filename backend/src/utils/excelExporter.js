import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

/**
 * Export an array of ScreenedCandidate documents to an Excel workbook buffer.
 *
 * @param {Array} candidates - ScreenedCandidate documents sorted by rank
 * @returns {Buffer} - xlsx buffer ready for res.download()
 */
export const exportCandidatesToExcel = (candidates) => {
  const rows = candidates.map((c) => ({
    Rank:           c.rank ?? "",
    Name:           c.name ?? "",
    Email:          c.email ?? "",
    Phone:          c.phone ?? "",
    Score:          c.scores?.total ?? 0,
    Recommendation: c.recommendation ?? "",
    Status:         c.status ?? "",
    Skills:         (c.skills || []).join(", "),
    Strengths:      (c.strengths || []).join(", "),
    Gaps:           (c.gaps || []).join(", "),
  }));

  const worksheet  = XLSX.utils.json_to_sheet(rows);
  const workbook   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};
