import { useCallback, useEffect, useState } from "react";
import type { Ctx, IpInfo } from "../types";
import LatencyChart from "../components/Chart";
import { computeStats } from "../lib/stats";

let cache: { at: number; info: IpInfo } | null = null;
const TTL = 5 * 60_000;

async function loadIpInfo(force: boolean): Promise<IpInfo> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.info;
  let info: IpInfo | null = null;
  try {
    const r = await fetch("/api/ip", { cache: "no-store" });
    if (r.ok) info = (await r.json()) as IpInfo;
  } catch { /* fall back to direct lookup */ }
  if (!info || !info.ip) {
    const r = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(6000) });
    const j = await r.json();
    if (!j.success) throw new Error(j.message ?? "IP lookup failed");
    info = {
      ip: j.ip, ipVersion: j.type === "IPv6" ? 6 : 4, provider: j.connection?.isp ?? j.connection?.org ?? null,
      country: j.country ?? null, region: j.region ?? null, city: j.city ?? null, asn: j.connection?.asn ?? null,
      source: "ipwho.is (direct from browser)", timestamp: new Date().toISOString(),
    };
  }
  cache = { at: Date.now(), info };
  return info;
}
async function probe(url: string): Promise<string | null> {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" }); return ((await r.json()) as { ip: string }).ip; }
  catch { return null; }
}

type Backend = "checking" | "ok" | "unavailable";

export default function Overview({ ctx }: { ctx: Ctx }) {
  const { store, log, update } = ctx;
  const [info, setInfo] = useState<IpInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [v4, setV4] = useState<string | null | undefined>(undefined);
  const [v6, setV6] = useState<string | null | undefined>(undefined);
  const [backend, setBackend] = useState<Backend>("checking");

  const refresh = useCallback(async (force: boolean) => {
    setLoading(true); setErr(null);
    try { const i = await loadIpInfo(force); setInfo(i); log("ok", `Network info loaded (${i.source})`); }
    catch (e) { setErr(e instanceof Error ? e.message : "Lookup failed"); log("error", "Network info lookup failed"); }
    const [a, b] = await Promise.all([probe("https://api.ipify.org?format=json"), probe("https://api6.ipify.org?format=json")]);
    setV4(a); setV6(b);
    try { const r = await fetch("/api/health", { cache: "no-store" }); const j = await r.json(); setBackend(j.status === "ok" ? "ok" : "unavailable"); }
    catch { setBackend("unavailable"); }
    setLoading(false);
  }, [log]);
  useEffect(() => { if (store.settings.ipConsent) void refresh(false); }, [refresh, store.settings.ipConsent]);

  const recent = store.latency.slice(-30);
  const last = [...store.latency].reverse().find((s) => s.ms !== null);
  const st = computeStats(recent.map((s) => s.ms).filter((x): x is number => x !== null));
  const line = (v: string | null | undefined) => (v === undefined ? "checking…" : v ?? "unavailable");

  if (!store.settings.ipConsent) return <section className="card consent-card">
    <span className="eyebrow">PRIVACY GATE</span><h2>Public IP intelligence</h2>
    <p>OBIX จะส่งข้อมูล IP สาธารณะของคุณไปยังผู้ให้บริการ metadata ภายนอกเพื่อแสดง ISP, ASN และตำแหน่งโดยประมาณ ข้อมูลตำแหน่งเป็นเพียงค่าประมาณและอาจไม่แม่นยำ</p>
    <p className="muted">จะไม่บันทึกประวัติ IP metadata โดยอัตโนมัติ และคุณปิดสิทธิ์นี้ได้จาก Settings ทุกเมื่อ</p>
    <button className="btn primary" onClick={() => update(s => ({ ...s, settings: { ...s.settings, ipConsent: true } }))}>ยอมรับและโหลดข้อมูล IP</button>
  </section>;
  return (
    <>
      <section className="card">
        <h2>Network overview</h2>
        <div className="row"><button className="btn" disabled={loading} onClick={() => void refresh(true)}>{loading ? "Scanning…" : "Refresh"}</button>
          {loading && <span className="scanner" aria-hidden="true" />}</div>
        {err && <p className="err" role="alert">{err}</p>}
        <dl className="kv">
          <dt>Public IPv4</dt><dd className="mono">{line(v4)}</dd>
          <dt>Public IPv6</dt><dd className="mono">{line(v6)}</dd>
          <dt>ISP</dt><dd>{info?.provider ?? "unavailable"}</dd>
          <dt>ASN</dt><dd>{info?.asn ?? "unavailable"}</dd>
          <dt>Country</dt><dd>{info?.country ?? "unavailable"}</dd>
          <dt>Region / city (approximate)</dt><dd>{[info?.region, info?.city].filter(Boolean).join(", ") || "unavailable"}</dd>
          <dt>Source</dt><dd>{info?.source ?? "—"}</dd>
          <dt>Last updated</dt><dd className="mono">{info?.timestamp ?? "—"}</dd>
        </dl>
        <p className="muted">Geolocation is approximate and based on IP databases. IPv4/IPv6 detected via ipify.</p>
      </section>
      <section className="card">
        <h2>Diagnostic overview</h2>
        <dl className="kv">
          <dt>Backend API</dt><dd className={backend === "ok" ? "ok" : "warn"}>{backend}</dd>
          <dt>Latest HTTP latency</dt><dd className="mono">{last?.ms != null ? `${last.ms.toFixed(1)} ms (${last.url})` : "no data"}</dd>
          <dt>Recent min / avg / max</dt><dd className="mono">{st ? `${st.min.toFixed(1)} / ${st.avg.toFixed(1)} / ${st.max.toFixed(1)} ms` : "no data"}</dd>
          <dt>Events logged</dt><dd>{store.events.length}</dd>
        </dl>
        <LatencyChart samples={recent} />
      </section>
    </>
  );
}
