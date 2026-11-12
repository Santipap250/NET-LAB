export const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA"] as const;
export type RecordType = (typeof RECORD_TYPES)[number];
export const RESOLVERS = {
  google: { label: "Google", url: "https://dns.google/resolve" },
  cloudflare: { label: "Cloudflare", url: "https://cloudflare-dns.com/dns-query" },
} as const;
export type ResolverId = keyof typeof RESOLVERS;
const TYPE_NAMES: Record<number, string> = { 1: "A", 28: "AAAA", 5: "CNAME", 15: "MX", 2: "NS", 16: "TXT", 6: "SOA" };
export const RCODES: Record<number, string> = { 0: "NOERROR", 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN", 4: "NOTIMP", 5: "REFUSED" };
export interface DnsRecord { name: string; type: string; ttl: number; data: string }
export interface DnsResult {
  resolver: string; status: "ok" | "error"; rcode?: string; records: DnsRecord[]; ms?: number; ts: string; error?: string;
}
export function parseDoh(json: unknown): { rcode: number; records: DnsRecord[] } {
  const j = json as { Status?: unknown; Answer?: unknown };
  if (!j || typeof j.Status !== "number") throw new Error("Unexpected resolver response");
  const records: DnsRecord[] = [];
  if (Array.isArray(j.Answer)) {
    for (const a of j.Answer as Record<string, unknown>[]) {
      if (typeof a.name === "string" && typeof a.type === "number" && typeof a.data === "string")
        records.push({ name: a.name, type: TYPE_NAMES[a.type] ?? `TYPE${a.type}`, ttl: Number(a.TTL ?? 0), data: a.data });
    }
  }
  return { rcode: j.Status, records };
}
export async function queryDoh(id: ResolverId, name: string, type: RecordType): Promise<DnsResult> {
  const r = RESOLVERS[id];
  const ts = new Date().toISOString();
  const t0 = performance.now();
  try {
    const res = await fetch(`${r.url}?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { rcode, records } = parseDoh(await res.json());
    return { resolver: r.label, status: "ok", rcode: RCODES[rcode] ?? String(rcode), records, ms: Math.round(performance.now() - t0), ts };
  } catch (e) {
    return { resolver: r.label, status: "error", records: [], ts, error: e instanceof Error ? e.message : "Query failed" };
  }
}
