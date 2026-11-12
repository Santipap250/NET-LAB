import { useState } from "react";
import type { Ctx, ResolverChoice } from "../types";
import { downloadText, toCsv } from "../lib/export";

export default function Monitor({ ctx }: { ctx: Ctx }) {
  const { store, log, update } = ctx;
  const [backend, setBackend] = useState<{ ok: boolean; at: string } | null>(null);
  const [lastOk, setLastOk] = useState<string | null>(null);

  async function check() {
    try {
      const r = await fetch("/api/health", { cache: "no-store" });
      const j = await r.json();
      const ok = j.status === "ok"; const at = new Date().toISOString();
      setBackend({ ok, at }); if (ok) setLastOk(at); log(ok ? "ok" : "error", `Health check: ${j.status}`);
    } catch { setBackend({ ok: false, at: new Date().toISOString() }); log("error", "Health check failed (backend unreachable)"); }
  }

  return (
    <section className="card">
      <h2>System monitor</h2>
      <dl className="kv">
        <dt>Frontend</dt><dd className="ok">running</dd>
        <dt>Backend</dt><dd className={backend ? (backend.ok ? "ok" : "err") : "muted"}>{backend ? (backend.ok ? "ok" : "unavailable") : "not checked"}</dd>
        <dt>Last successful request</dt><dd className="mono">{lastOk ?? "none"}</dd>
        <dt>Stored events / latency samples</dt><dd>{store.events.length} / {store.latency.length}</dd>
      </dl>
      <div className="row">
        <button className="btn primary" onClick={() => void check()}>Check backend</button>
        <button className="btn" onClick={() => downloadText("obix-history.json", JSON.stringify({ events: store.events, latency: store.latency }, null, 2))}>Export JSON</button>
        <button className="btn" onClick={() => downloadText("obix-events.csv", toCsv(store.events as unknown as Record<string, unknown>[]), "text/csv")}>Events CSV</button>
        <button className="btn" onClick={() => downloadText("obix-latency.csv", toCsv(store.latency as unknown as Record<string, unknown>[]), "text/csv")}>Latency CSV</button>
        <button className="btn danger" onClick={() => { if (confirm("Clear all local history?")) update((s) => ({ ...s, events: [], latency: [] })); }}>Clear history</button>
      </div>
      <h3>Settings</h3>
      <div className="row">
        <label><input type="checkbox" checked={store.settings.autoScroll} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, autoScroll: e.target.checked } }))} /> Terminal auto-scroll</label>
        <label>Default DNS resolver<select value={store.settings.resolver} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, resolver: e.target.value as ResolverChoice } }))}>
          <option value="google">Google</option><option value="cloudflare">Cloudflare</option><option value="compare">Compare both</option></select></label>
        <label><input type="checkbox" checked={store.settings.ipConsent} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, ipConsent: e.target.checked } }))} /> Allow external IP metadata lookup (ipwho.is)</label>
        <label>History retention<select value={store.settings.historyRetention} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, historyRetention: Number(e.target.value) } }))}><option value={50}>50 reports</option><option value={100}>100 reports</option><option value={250}>250 reports</option></select></label>
      </div>
      <p className="muted">All data is stored in this browser only (LocalStorage, schema v{store.version}).</p>
    </section>
  );
}
