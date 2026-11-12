export type LogLevel = "info" | "ok" | "warn" | "error";
export interface LogEntry { ts: string; level: LogLevel; msg: string }
export interface LatencySample { ts: string; url: string; ms: number | null; ok: boolean; note?: string }
export type ResolverChoice = "google" | "cloudflare" | "compare";
export type Language = "th" | "en";
export interface Settings {
  autoScroll: boolean;
  resolver: ResolverChoice;
  language: Language;
  ipConsent: boolean;
  historyRetention: number;
}
export interface DiagnosticReport {
  id: string;
  ts: string;
  status: "healthy" | "degraded" | "unstable" | "unavailable";
  endpoint: string;
  rttMs: number | null;
  dns: string;
  ipv4: boolean | null;
  ipv6: boolean | null;
  success: number;
  failure: number;
  explanation: string;
}
export interface Store {
  version: number;
  settings: Settings;
  events: LogEntry[];
  latency: LatencySample[];
  reports: DiagnosticReport[];
}
export interface IpInfo {
  ip: string; ipVersion: 4 | 6; provider: string | null; country: string | null;
  region: string | null; city?: string | null; asn: string | number | null; source: string; timestamp: string;
}
export type Tab = "home" | "diagnose" | "dns" | "toolkit" | "history";
export type LegacyTab = "overview" | "latency" | "http" | "route" | "monitor";
export interface Ctx {
  store: Store;
  log: (level: LogLevel, msg: string) => void;
  update: (fn: (s: Store) => Store) => void;
  go: (t: Tab) => void;
  language: Language;
}
