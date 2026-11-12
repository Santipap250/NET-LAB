export interface Stats { count: number; min: number; max: number; avg: number; median: number; jitter: number }
export function computeStats(v: number[]): Stats | null {
  if (v.length === 0) return null;
  const s = [...v].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const median = s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
  let j = 0;
  for (let i = 1; i < v.length; i++) j += Math.abs(v[i]! - v[i - 1]!);
  return {
    count: v.length, min: s[0]!, max: s[s.length - 1]!,
    avg: v.reduce((a, b) => a + b, 0) / v.length, median, jitter: v.length > 1 ? j / (v.length - 1) : 0,
  };
}
