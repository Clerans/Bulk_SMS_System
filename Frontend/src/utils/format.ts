export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "0%";
  return ((numerator / denominator) * 100).toFixed(1) + "%";
}

export function formatPct(value: number): string {
  return value.toFixed(1) + "%";
}
