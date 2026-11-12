import type { DiagnosticReport } from "../types";
export async function timedFetch(url: string, init?: RequestInit): Promise<{ ok: boolean; ms: number | null }> {
  const t = performance.now();
  try { const r = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(6000) }); return { ok: r.ok, ms: Math.round((performance.now() - t) * 10) / 10 }; }
  catch (error) { if (init?.signal?.aborted) throw error; return { ok: false, ms: null }; }
}
export async function runDiagnostics(endpoint = "https://example.com", signal?: AbortSignal, onStep?: (message: string) => void): Promise<DiagnosticReport> {
  const started = new Date().toISOString(); let success = 0; let failure = 0;
  onStep?.("Checking same-origin health"); const health = await timedFetch("/api/health", { signal }); if (health.ok) success++; else failure++;
  onStep?.("Measuring real HTTP RTT"); const http = await timedFetch(endpoint, { signal }); if (http.ok) success++; else failure++;
  onStep?.("Resolving example.com via trusted DoH"); const dns = await timedFetch("https://dns.google/resolve?name=example.com&type=A", { headers: { accept: "application/dns-json" }, signal }); if (dns.ok) success++; else failure++;
  onStep?.("Checking public IPv4/IPv6 availability"); const [v4, v6] = await Promise.all([timedFetch("https://api.ipify.org?format=json", { signal }), timedFetch("https://api6.ipify.org?format=json", { signal })]);
  if (v4.ok) success++; else failure++; if (v6.ok) success++; else failure++;
  const status: DiagnosticReport["status"] = success === 5 ? "healthy" : success >= 3 ? "degraded" : success > 0 ? "unstable" : "unavailable";
  const explanation = status === "healthy" ? "All browser-accessible checks succeeded." : status === "degraded" ? "Some checks succeeded; inspect the failed signal before changing settings." : status === "unstable" ? "The path is partially reachable; repeat once and compare timestamps." : "No browser-accessible diagnostic check succeeded.";
  return { id: started, ts: started, status, endpoint, rttMs: http.ms, dns: dns.ok ? "NOERROR / reachable" : "unavailable", ipv4: v4.ok, ipv6: v6.ok, success, failure, explanation };
}
