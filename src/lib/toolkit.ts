export interface SubnetResult { ip: string; cidr: number; network: string; broadcast: string; mask: string; wildcard: string; first: string; last: string; hosts: number; binary: string }
export function ipv4ToInt(ip: string): number | null { const p = ip.trim().split("."); if (p.length !== 4 || p.some(x => !/^\d+$/.test(x) || Number(x) > 255)) return null; return p.reduce((n, x) => ((n << 8) | Number(x)) >>> 0, 0); }
export function intToIpv4(n: number): string { return [24,16,8,0].map(s => (n >>> s) & 255).join("."); }
export function ipv4ToBinary(ip: string): string | null { const n = ipv4ToInt(ip); return n === null ? null : [24,16,8,0].map(s => (n >>> s & 255).toString(2).padStart(8, "0")).join("."); }
export function subnet(ip: string, cidrText: string): SubnetResult | null {
  const n = ipv4ToInt(ip); const cidr = Number(cidrText); if (n === null || !Number.isInteger(cidr) || cidr < 0 || cidr > 32) return null;
  const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0; const network = n & mask; const broadcast = (network | (~mask >>> 0)) >>> 0;
  const span = (broadcast - network) >>> 0;
  const hosts = cidr >= 31 ? span + 1 : Math.max(0, span - 1);
  return { ip, cidr, network: intToIpv4(network), broadcast: intToIpv4(broadcast), mask: intToIpv4(mask), wildcard: intToIpv4((~mask) >>> 0), first: cidr >= 31 ? intToIpv4(network) : intToIpv4(network + 1), last: cidr >= 31 ? intToIpv4(broadcast) : intToIpv4(broadcast - 1), hosts, binary: ipv4ToBinary(ip) ?? "" };
}
export function isDomain(value: string): boolean { const x = value.trim().replace(/\.$/, ""); return x.length <= 253 && x.length > 0 && x.split(".").every(p => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(p)); }
export function normalizeDomain(value: string): string { return value.trim().replace(/^https?:\/\//i, "").split(/[/?#]/)[0].toLowerCase().replace(/\.$/, ""); }
export function formatJson(value: string, minify = false): { ok: true; value: string } | { ok: false; error: string } { try { const parsed = JSON.parse(value); return { ok: true, value: JSON.stringify(parsed, null, minify ? 0 : 2) }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" }; } }
export function base64(value: string): string { return btoa(unescape(encodeURIComponent(value))); }
export function fromBase64(value: string): string { return decodeURIComponent(escape(atob(value))); }
export async function sha256(value: string): Promise<string> { const data = new TextEncoder().encode(value); const hash = await crypto.subtle.digest("SHA-256", data); return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, "0")).join(""); }
export const HTTP_STATUS: Record<number, string> = { 200: "OK", 201: "Created", 204: "No Content", 301: "Moved Permanently", 302: "Found", 304: "Not Modified", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 408: "Request Timeout", 429: "Too Many Requests", 500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout" };
