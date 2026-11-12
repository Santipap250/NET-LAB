export interface Hop { hop: number; host: string | null; ip: string | null; timesMs: number[]; timeouts: number; avgMs: number | null }
const IP_RE = /(\d{1,3}(?:\.\d{1,3}){3})|\b((?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4})\b/i;
export function parseTraceroute(text: string): Hop[] {
  const hops: Hop[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^\s*(\d{1,3})\s+(.*)$/);
    if (!m) continue;
    const rest = m[2]!;
    const timesMs = [...rest.matchAll(/(<?\s*\d+(?:\.\d+)?)\s*ms/gi)].map((x) => Number(x[1]!.replace(/[<\s]/g, "")));
    const timeouts = (rest.match(/\*/g) ?? []).length;
    let host: string | null = null;
    let ip: string | null = null;
    const br = rest.match(/(\S+)\s+[\[(]([^\])]+)[\])]/);
    if (br) { host = br[1]!; ip = br[2]!; }
    else { const im = rest.match(IP_RE); ip = im ? (im[1] ?? im[2] ?? null) : null; }
    if (timesMs.length === 0 && timeouts === 0 && !ip) continue;
    hops.push({
      hop: Number(m[1]), host, ip, timesMs, timeouts,
      avgMs: timesMs.length ? timesMs.reduce((a, b) => a + b, 0) / timesMs.length : null,
    });
  }
  return hops;
}
