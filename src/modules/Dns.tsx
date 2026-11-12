import { useState } from "react";
import type { Ctx } from "../types";
import { RECORD_TYPES, RESOLVERS, queryDoh, type DnsResult, type RecordType, type ResolverId } from "../lib/dns";
import { isDomain } from "../lib/validate";
import { copyText, downloadText } from "../lib/export";

export default function Dns({ ctx }: { ctx: Ctx }) {
  const { store, log, update } = ctx;
  const [name, setName] = useState("");
  const [type, setType] = useState<RecordType>("A");
  const [results, setResults] = useState<DnsResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const choice = store.settings.resolver;

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const d = name.trim().replace(/\.$/, "").toLowerCase();
    if (!isDomain(d)) { setErr("Enter a valid domain name, e.g. example.com"); return; }
    setErr(null); setBusy(true);
    const ids: ResolverId[] = choice === "compare" ? ["google", "cloudflare"] : [choice];
    const res = await Promise.all(ids.map((id) => queryDoh(id, d, type)));
    setResults(res); setBusy(false);
    for (const r of res) log(r.status === "ok" ? "ok" : "error", `DNS ${type} ${d} via ${r.resolver}: ${r.status === "ok" ? `${r.rcode}, ${r.records.length} record(s)` : r.error}`);
  }

  return (
    <section className="card">
      <h2>DNS intelligence</h2>
      <form className="row" onSubmit={run}>
        <label className="grow">Domain<input value={name} onChange={(e) => setName(e.target.value)} placeholder="example.com" autoCapitalize="none" spellCheck={false} /></label>
        <label>Type<select value={type} onChange={(e) => setType(e.target.value as RecordType)}>{RECORD_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Resolver<select value={choice} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, resolver: e.target.value as typeof choice } }))}>
          {Object.entries(RESOLVERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}<option value="compare">Compare both</option></select></label>
        <button className="btn primary" disabled={busy}>{busy ? "Querying…" : "Lookup"}</button>
      </form>
      {err && <p className="err" role="alert">{err}</p>}
      {results && <button className="btn" onClick={() => downloadText(`dns-${Date.now()}.json`, JSON.stringify(results, null, 2))}>Export JSON</button>}
      {results?.map((r) => (
        <div key={r.resolver} className="sub">
          <h3>{r.resolver} <span className="muted mono">{r.ts}{r.ms !== undefined ? ` · ${r.ms} ms` : ""}</span></h3>
          {r.status === "error" ? <p className="err" role="alert">{r.error}</p>
            : r.records.length === 0 ? <p className="muted">No {type} records (status {r.rcode}).</p>
            : <div className="scroll"><table><thead><tr><th>Name</th><th>Type</th><th>TTL</th><th>Data</th><th /></tr></thead><tbody>
              {r.records.map((x, i) => <tr key={i}><td className="mono">{x.name}</td><td>{x.type}</td><td>{x.ttl}</td><td className="mono wrap">{x.data}</td>
                <td><button className="btn" onClick={async () => log((await copyText(x.data)) ? "ok" : "warn", "Record copied")}>Copy</button></td></tr>)}
            </tbody></table><p className="muted">{r.records.length} record(s)</p></div>}
        </div>
      ))}
    </section>
  );
}
