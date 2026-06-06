import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

/**
 * Extract and clean text from a PDF buffer.
 * Returns null if the buffer is corrupt, password-protected, or yields no text.
 *
 * @param {Buffer} buffer
 * @returns {Promise<string|null>}
 */
export const extractPdfText = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    const text = (data.text || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
};
