import type { TemplateResolveResult } from "../types/common";

/**
 * Resolves {variable} placeholders in a template string against a recipient object.
 * Returns both the resolved text and a list of variables that could not be resolved.
 * Missing variables are left as-is (e.g. {code}) rather than replaced with misleading text.
 */
export function resolveTemplate(
  template: string,
  recipient: Record<string, string>
): TemplateResolveResult {
  const unresolvedVariables: string[] = [];

  const text = template.replace(/\{(\w+)\}/g, (match, varName: string) => {
    const value = recipient[varName];
    if (value !== undefined && value !== "") {
      return value;
    }
    unresolvedVariables.push(varName);
    return match; // preserve the original placeholder
  });

  return { text, unresolvedVariables };
}

/**
 * Extracts all {variable} names from a template string.
 */
export function extractVariables(template: string): string[] {
  const matches = [...template.matchAll(/\{(\w+)\}/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

/**
 * Inserts text at the cursor position of a textarea element.
 * Returns the new full string value.
 */
export function insertAtCursor(
  value: string,
  insert: string,
  selectionStart: number,
  selectionEnd: number
): { newValue: string; newCursorPos: number } {
  const newValue = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
  const newCursorPos = selectionStart + insert.length;
  return { newValue, newCursorPos };
}
