import type { Store } from "../types";
export const STORE_KEY = "obix-netlab";
export const STORE_VERSION = 1;
export const defaultStore = (): Store => ({
  version: STORE_VERSION, settings: { autoScroll: true, resolver: "compare" }, events: [], latency: [],
});
export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultStore();
    const p = JSON.parse(raw);
    if (p && p.version === STORE_VERSION && Array.isArray(p.events) && Array.isArray(p.latency) && p.settings &&
        typeof p.settings.autoScroll === "boolean" && ["google", "cloudflare", "compare"].includes(p.settings.resolver))
      return p as Store;
  } catch { /* fall through to recovery */ }
  try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
  return defaultStore();
}
export function saveStore(s: Store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* quota / private mode */ }
}
