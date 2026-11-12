export type LogLevel = "info" | "ok" | "warn" | "error";
export interface LogEntry { ts: string; level: LogLevel; msg: string }
export interface LatencySample { ts: string; url: string; ms: number | null; ok: boolean; note?: string }
export type ResolverChoice = "google" | "cloudflare" | "compare";
export interface Settings { autoScroll: boolean; resolver: ResolverChoice }
export interface Store { version: number; settings: Settings; events: LogEntry[]; latency: LatencySample[] }
export interface IpInfo {
  ip: string; ipVersion: 4 | 6; provider: string | null; country: string | null;
  region: string | null; city?: string | null; asn: string | number | null; source: string; timestamp: string;
}
export type Tab = "overview" | "dns" | "latency" | "http" | "route" | "monitor";
export interface Ctx {
  store: Store;
  log: (level: LogLevel, msg: string) => void;
  update: (fn: (s: Store) => Store) => void;
  go: (t: Tab) => void;
}
