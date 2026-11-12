import { useRef, useState } from "react";
import type { Ctx, LatencySample } from "../types";
import { normalizeUrl } from "../lib/validate";
import { computeStats } from "../lib/stats";
import LatencyChart from "../components/Chart";

type Cors = "allowed" | "blocked" | "unreachable" | null;

async function measure(url: string, mode: RequestMode, stop: AbortSignal) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  const onStop = () => ctl.abort();
  stop.addEventListener("abort", onStop);
  const t0 = performance.now();
  try {
    await fetch(url, { mode, cache: "no-store", signal: ctl.signal });
    return { ms: performance.now() - t0, ok: true as const, note: undefined };
  } catch {
    return { ms: null, ok: false as const, note: stop.aborted ? "stopped" : ctl.signal.aborted ? "timeout" : "network error" };
  } finally { clearTimeout(timer); stop.removeEventListener("abort", onStop); }
}

export default function Latency({ ctx }: { ctx: Ctx }) {
  const { store, log, update } = ctx;
  const [url, setUrl] = useState("");
  const [count, setCount] = useState(5);
  const [run, setRun] = useState<LatencySample[]>([]);
  const [running, setRunning] = useState(false);
  const [cors, setCors] = useState<Cors>(null);
  const [err, setErr] = useState<string | null>(null);
  const ctl = useRef<AbortController | null>(null);

  async function start() {
    const u = normalizeUrl(url);
    if (!u) { setErr("Enter a valid http(s) URL."); return; }
    const n = Math.min(20, Math.max(1, Math.floor(count) || 1));
    setErr(null); setRun([]); setCors(null); setRunning(true);
    const c = new AbortController(); ctl.current = c;
    log("info", `Latency test started: ${u} x${n}`);
    const corsProbe = await measure(u, "cors", c.signal);
    for (let i = 0; i < n && !c.signal.aborted; i++) {
      const r = await measure(u, "no-cors", c.signal); // opaque response: timing to response headers only
      if (c.signal.aborted && !r.ok) break;
      if (i === 0) setCors(corsProbe.ok ? "allowed" : r.ok ? "blocked" : "unreachable");
      const s: LatencySample = { ts: new Date().toISOString(), url: u, ms: r.ms, ok: r.ok, ...(r.note ? { note: r.note } : {}) };
      setRun((p) => [...p, s]);
      update((st) => ({ ...st, latency: [...st.latency, s].slice(-200) }));
      log(r.ok ? "ok" : "error", `${u} → ${r.ok ? `${r.ms.toFixed(1)} ms` : r.note}`);
      if (i < n - 1) await new Promise((res) => { const t = setTimeout(res, 1000); c.signal.addEventListener("abort", () => { clearTimeout(t); res(null); }, { once: true }); });
    }
    log("info", c.signal.aborted ? "Latency test stopped" : "Latency test finished");
    setRunning(false);
  }

  const st = computeStats(run.map((s) => s.ms).filter((x): x is number => x !== null));
  const fails = run.filter((s) => !s.ok).length;
  const f = (v: number | undefined) => (v === undefined ? "—" : `${v.toFixed(1)} ms`);

  return (
    <section className="card">
      <h2>Latency lab</h2>
      <p className="muted">Measures HTTP time-to-response from your browser. This is <b>not ICMP ping</b>; packet loss cannot be measured here.
        Requests are spaced 1 s apart, max 20 per run. Plain http:// targets are blocked from https pages by the browser.</p>
      <div className="row">
        <label className="grow">URL<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" autoCapitalize="none" spellCheck={false} /></label>
        <label>Count<input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} /></label>
        {running ? <button className="btn danger" onClick={() => ctl.current?.abort()}>Stop</button> : <button className="btn primary" onClick={() => void start()}>Start</button>}
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      {cors && <p className={cors === "allowed" ? "ok" : cors === "blocked" ? "warn" : "err"}>CORS: {cors === "allowed" ? "server allows cross-origin reads" : cors === "blocked" ? "blocked by CORS (server is reachable; timing only)" : "target unreachable (connection failure)"}</p>}
      <dl className="kv">
        <dt>Min / Max</dt><dd className="mono">{f(st?.min)} / {f(st?.max)}</dd>
        <dt>Average / Median</dt><dd className="mono">{f(st?.avg)} / {f(st?.median)}</dd>
        <dt>Jitter (mean abs. delta)</dt><dd className="mono">{f(st?.jitter)}</dd>
        <dt>Success / Failure</dt><dd>{run.length - fails} / {fails}</dd>
      </dl>
      <LatencyChart samples={store.latency.slice(-60)} />
      {run.length === 0 && !running && <p className="muted">No test run yet.</p>}
    </section>
  );
}
