const OCT = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const V4 = new RegExp(`^${OCT}(\\.${OCT}){3}$`);
export const isIPv4 = (s: string): boolean => V4.test(s);
export function isIPv6(s: string): boolean {
  if (!s.includes(":") || /[\s/\[\]]/.test(s)) return false;
  try { new URL(`http://[${s}]/`); return true; } catch { return false; }
}
export const isDomain = (s: string): boolean =>
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/i.test(s);
export function normalizeUrl(input: string): string | null {
  let v = input.trim();
  if (!v) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch { return null; }
}
