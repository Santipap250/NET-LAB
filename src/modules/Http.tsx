import { useState } from "react";
import type { Ctx } from "../types";
import { normalizeUrl } from "../lib/validate";
import { downloadText } from "../lib/export";

interface Result {
  requestedUrl: string; finalUrl: string; statusCode: number; responseTimeMs: number;
  responseHeaders: Record<string, string>; redirectChain: { url: string; statusCode: number; location?: string }[]; timestamp: string;
}

export default function Http({ ctx }: { ctx: Ctx }) {
  const { log } = ctx;
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"GET" | "HEAD">("HEAD");
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const u = normalizeUrl(url);
    if (!u) { setErr("Enter a valid http(s) URL."); return; }
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await fetch("/api/inspect-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: u, method }) });
      const ct = r.headers.get("content-type") ?? "";
      if (!ct.includes("json")) throw new Error("Backend API not available. Run with `vercel dev` or deploy to Vercel.");
      const j = await r.json();
      if (!r.ok) throw new Error(`${j.error?.code ?? "ERROR"}: ${j.error?.message ?? "Request failed"}`);
      setRes(j as Result); log("ok", `${method} ${u} → ${j.statusCode} (${j.responseTimeMs} ms)`);
    } catch (e2) {
      const m = e2 instanceof Error ? e2.message : "Request failed"; setErr(m); log("error", `Inspect failed: ${m}`);
    }
    setBusy(false);
  }

  return (
    <section className="card">
      <h2>HTTP diagnostics</h2>
      <p className="muted">Requests are sent from the server with SSRF protections. Response bodies are never read or returned. Total time includes DNS and redirects.</p>
      <form className="row" onSubmit={run}>
        <label className="grow">URL<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" autoCapitalize="none" spellCheck={false} /></label>
        <label>Method<select value={method} onChange={(e) => setMethod(e.target.value as "GET" | "HEAD")}><option>HEAD</option><option>GET</option></select></label>
        <button className="btn primary" disabled={busy}>{busy ? "Inspecting…" : "Inspect"}</button>
      </form>
      {err && <p className="err" role="alert">{err}</p>}
      {res && (
        <>
          <button className="btn" onClick={() => downloadText(`http-${Date.now()}.json`, JSON.stringify(res, null, 2))}>Export JSON</button>
          <dl className="kv">
            <dt>Status</dt><dd>{res.statusCode}</dd>
            <dt>Duration</dt><dd className="mono">{res.responseTimeMs} ms</dd>
            <dt>Final URL</dt><dd className="mono wrap">{res.finalUrl}</dd>
            <dt>Content-Type</dt><dd>{res.responseHeaders["content-type"] ?? "unavailable"}</dd>
            <dt>CORS allow-origin</dt><dd>{res.responseHeaders["access-control-allow-origin"] ?? "not sent"}</dd>
            <dt>Timestamp</dt><dd className="mono">{res.timestamp}</dd>
          </dl>
          <h3>Redirect chain ({res.redirectChain.length} hop{res.redirectChain.length === 1 ? "" : "s"})</h3>
          <ol className="mono wrap">{res.redirectChain.map((h, i) => <li key={i}>{h.statusCode} {h.url}{h.location ? ` → ${h.location}` : ""}</li>)}</ol>
          <h3>Response headers</h3>
          <div className="scroll"><table><tbody>{Object.entries(res.responseHeaders).map(([k, v]) => <tr key={k}><td className="mono">{k}</td><td className="mono wrap">{v}</td></tr>)}</tbody></table></div>
          <p className="muted">TLS metadata is not collected in this version.</p>
        </>
      )}
    </section>
  );
}
