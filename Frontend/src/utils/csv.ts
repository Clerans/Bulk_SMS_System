import { normalizePhone } from "./phone";
import type { CsvParseResult, CsvRecipient } from "../types/common";

export function parseCsvText(csvText: string, countryCode?: string): CsvParseResult {
  const lines = csvText.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) {
    return {
      rows: [],
      headers: [],
      stats: { total: 0, valid: 0, invalid: 0, duplicates: 0 },
    };
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  if (!headers.includes("phone")) {
    throw new Error("CSV must contain a 'phone' column.");
  }

  const rows: CsvRecipient[] = [];
  let invalid = 0;
  let duplicates = 0;
  const seen = new Set<string>();
  const total = lines.length - 1;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const row: CsvRecipient = { name: "", phone: "" };
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });

    const result = normalizePhone(row.phone, countryCode);
    if (!result.valid || !result.normalized) {
      invalid++;
      continue;
    }

    if (seen.has(result.normalized)) {
      duplicates++;
      continue;
    }

    seen.add(result.normalized);
    row.phone = result.normalized;
    rows.push(row);
  }

  return {
    rows,
    headers,
    stats: { total, valid: rows.length, invalid, duplicates },
  };
}
