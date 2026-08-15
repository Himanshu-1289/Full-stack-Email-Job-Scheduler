import Papa from "papaparse";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Accepts either a CSV (with or without headers) or a plain newline/comma
 * separated text file of email addresses, and returns the deduped, valid
 * list of recipient emails.
 */
export function parseLeadsFile(fileBuffer: Buffer): string[] {
  const text = fileBuffer.toString("utf-8");
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });

  const found = new Set<string>();
  for (const row of parsed.data) {
    for (const cell of row) {
      const candidate = String(cell).trim();
      if (EMAIL_RE.test(candidate)) {
        found.add(candidate.toLowerCase());
      }
    }
  }
  return Array.from(found);
}
