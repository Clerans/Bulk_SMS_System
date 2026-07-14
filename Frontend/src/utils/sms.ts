import type { SmsEncoding } from "../types/common";

// GSM 03.38 basic character set
const GSM7_BASIC = new Set([
  "@", "£", "$", "¥", "è", "é", "ù", "ì", "ò", "Ç", "\n", "Ø", "ø", "\r",
  "Å", "å", "Δ", "_", "Φ", "Γ", "Λ", "Ω", "Π", "Ψ", "Σ", "Θ", "Ξ",
  "Æ", "æ", "ß", "É", " ", "!", '"', "#", "¤", "%", "&", "'", "(", ")",
  "*", "+", ",", "-", ".", "/",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  ":", ";", "<", "=", ">", "?", "¡",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "Ä", "Ö", "Ñ", "Ü", "§",
  "¿",
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
  "ä", "ö", "ñ", "ü", "à",
]);

// GSM 03.38 extension table characters (count as 2 units each)
const GSM7_EXT = new Set(["|", "^", "€", "{", "}", "[", "]", "~", "\\"]);

export function detectEncoding(text: string): "GSM-7" | "Unicode" {
  for (const char of text) {
    if (!GSM7_BASIC.has(char) && !GSM7_EXT.has(char)) {
      return "Unicode";
    }
  }
  return "GSM-7";
}

export function calculateSmsSegments(text: string): SmsEncoding {
  const encoding = detectEncoding(text);

  // For GSM-7, extension chars count as 2 units
  let characterCount: number;
  if (encoding === "GSM-7") {
    characterCount = [...text].reduce((count, char) => {
      return count + (GSM7_EXT.has(char) ? 2 : 1);
    }, 0);
  } else {
    characterCount = [...text].length;
  }

  const singleLimit = encoding === "GSM-7" ? 160 : 70;
  const multiLimit = encoding === "GSM-7" ? 153 : 67;

  let segmentCount: number;
  let remainingCharacters: number;

  if (characterCount === 0) {
    segmentCount = 0;
    remainingCharacters = singleLimit;
  } else if (characterCount <= singleLimit) {
    segmentCount = 1;
    remainingCharacters = singleLimit - characterCount;
  } else {
    segmentCount = Math.ceil(characterCount / multiLimit);
    remainingCharacters = segmentCount * multiLimit - characterCount;
  }

  return {
    encoding,
    characterCount,
    segmentCount,
    charactersPerSegment: characterCount <= singleLimit ? singleLimit : multiLimit,
    remainingCharacters,
  };
}
