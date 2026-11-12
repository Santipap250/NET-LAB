import { useMemo, useState } from "react";
import type { Ctx } from "../types";
import { parseTraceroute } from "../lib/traceroute";
import { downloadText, toCsv } from "../lib/export";

export default function Route({ ctx }: { ctx: Ctx }) {
  const { log } = ctx;
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseTraceroute> | null>(null);
  const max = useMemo(() => Math.max(1, ...(parsed ?? []).map((h) => h.avgMs ?? 0)), [parsed]);
  const rows = (parsed ?? []).map((h) => ({ hop: h.hop, host: h.host ?? "", ip: h.ip ?? "", times_ms: h.timesMs.join(" "), timeouts: h.timeouts, avg_ms: h.avgMs?.toFixed(2) ?? "" }));

  return (
    <section className="card">
      <h2>Route intelligence</h2>
      <p className="muted">Paste the output of <span className="mono">traceroute</span> / <span className="mono">tracert</span> / <span className="mono">mtr</span> run on your own machine. Browsers cannot run traceroute. Only imported, parsed data is shown.</p>
      <label>Traceroute output<textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} className="mono" /></label>
      <div className="row"><button className="btn primary" onClick={() => { const p = parseTraceroute(text); setParsed(p); log(p.length ? "ok" : "warn", `Traceroute parsed: ${p.length} hop(s)`); }}>Parse</button>
        {parsed && parsed.length > 0 && <>
          <button className="btn" onClick={() => downloadText("route.json", JSON.stringify(parsed, null, 2))}>Export JSON</button>
          <button className="btn" onClick={() => downloadText("route.csv", toCsv(rows), "text/csv")}>Export CSV</button></>}</div>
      {parsed && parsed.length === 0 && <p className="err" role="alert">No hops recognised in the input.</p>}
      {parsed && parsed.length > 0 && <div className="scroll"><table><thead><tr><th>Hop</th><th>Host</th><th>IP</th><th>Times (ms)</th><th>Avg</th><th /></tr></thead><tbody>
        {parsed.map((h) => <tr key={h.hop + (h.ip ?? "")}><td>{h.hop}</td><td className="mono wrap">{h.host ?? "—"}</td><td className="mono">{h.ip ?? (h.timeouts ? "timeout" : "—")}</td>
          <td className="mono">{h.timesMs.length ? h.timesMs.join(", ") : "—"}</td><td className="mono">{h.avgMs !== null ? h.avgMs.toFixed(1) : "n/a"}</td>
          <td className="barcell"><div className="bar" style={{ width: `${h.avgMs !== null ? (h.avgMs / max) * 100 : 0}%` }} /></td></tr>)}
      </tbody></table></div>}
    </section>
  );
}
