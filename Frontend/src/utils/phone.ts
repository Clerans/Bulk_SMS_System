import type { PhoneNormalizeResult } from "../types/common";

const DEFAULT_COUNTRY_CODE = "94"; // Sri Lanka

export function normalizePhone(
  raw: string,
  countryCode: string = DEFAULT_COUNTRY_CODE
): PhoneNormalizeResult {
  const original = raw.trim();
  const cleaned = original.replace(/[\s\-().]/g, "");

  // Must contain only digits and an optional leading +
  if (!/^\+?\d+$/.test(cleaned)) {
    return { original, normalized: null, valid: false, reason: "Contains non-numeric characters" };
  }

  const digits = cleaned.replace(/^\+/, "");

  if (digits.length < 7) {
    return { original, normalized: null, valid: false, reason: "Number is too short" };
  }
  if (digits.length > 15) {
    return { original, normalized: null, valid: false, reason: "Number exceeds E.164 maximum length" };
  }

  let normalized: string;

  if (cleaned.startsWith("+")) {
    // Already in international format
    normalized = "+" + digits;
  } else if (digits.startsWith("00")) {
    // International prefix via 00
    normalized = "+" + digits.slice(2);
  } else if (digits.startsWith(countryCode) && digits.length > 9) {
    // e.g. 94771234567 — already has country code without +
    normalized = "+" + digits;
  } else if (digits.startsWith("0") && countryCode === "94" && digits.length === 10) {
    // Sri Lankan local: 0771234567 → +94771234567
    normalized = "+" + countryCode + digits.slice(1);
  } else if (digits.length <= 10 && countryCode) {
    // Bare local number — prepend country code
    normalized = "+" + countryCode + digits;
  } else {
    normalized = "+" + digits;
  }

  return { original, normalized, valid: true };
}

export function parseManualNumbers(
  input: string,
  countryCode?: string
): { valid: string[]; invalid: string[] } {
  const entries = input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const result = normalizePhone(entry, countryCode);
    if (result.valid && result.normalized) {
      if (!seen.has(result.normalized)) {
        seen.add(result.normalized);
        valid.push(result.normalized);
      }
    } else {
      invalid.push(entry);
    }
  }

  return { valid, invalid };
}
