import type { Store } from "../types";
export const STORE_KEY = "obix-netlab";
export const STORE_VERSION = 2;
export const defaultStore = (): Store => ({
  version: STORE_VERSION,
  settings: { autoScroll: true, resolver: "compare", language: "th", ipConsent: false, historyRetention: 100 },
  events: [], latency: [], reports: [],
});
function validSettings(s: unknown): boolean {
  const x = s as Record<string, unknown> | null;
  return !!x && typeof x.autoScroll === "boolean" && ["google", "cloudflare", "compare"].includes(String(x.resolver));
}
export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultStore();
    const p = JSON.parse(raw) as Partial<Store> & { settings?: Record<string, unknown> };
    if (!validSettings(p.settings) || !Array.isArray(p.events) || !Array.isArray(p.latency)) throw new Error("invalid store");
    const rawSettings = p.settings as Record<string, unknown>;
    const base = defaultStore();
    const settings = {
      ...base.settings,
      ...rawSettings,
      language: rawSettings.language === "en" ? "en" : "th",
      ipConsent: rawSettings.ipConsent === true,
      historyRetention: Number.isFinite(Number(rawSettings.historyRetention)) ? Math.max(20, Math.min(500, Number(rawSettings.historyRetention))) : 100,
    } as Store["settings"];
    return {
      version: STORE_VERSION, settings,
      events: p.events.slice(-500), latency: p.latency.slice(-500),
      reports: Array.isArray(p.reports) ? p.reports.slice(-100) : [],
    };
  } catch {
    try { localStorage.removeItem(STORE_KEY); } catch { /* private mode */ }
    return defaultStore();
  }
}
export function saveStore(s: Store) {
  try {
    const keep = Math.max(20, Math.min(500, s.settings.historyRetention));
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...s, version: STORE_VERSION, events: s.events.slice(-500), latency: s.latency.slice(-500), reports: s.reports.slice(-keep) }));
  } catch { /* quota / private mode */ }
}
