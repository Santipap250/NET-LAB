import type { LatencySample } from "../types";

export default function LatencyChart({ samples }: { samples: LatencySample[] }) {
  if (samples.length === 0) return <p className="muted">No measurements yet.</p>;
  const W = 600, H = 160, P = 24;
  const vals = samples.map((s) => s.ms).filter((x): x is number => x !== null);
  const max = Math.max(1, ...vals);
  const step = samples.length > 1 ? (W - 2 * P) / (samples.length - 1) : 0;
  const x = (i: number) => P + i * step;
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const segs: string[] = [];
  let cur: string[] = [];
  samples.forEach((s, i) => {
    if (s.ms === null) { if (cur.length) segs.push(cur.join(" ")); cur = []; }
    else cur.push(`${x(i)},${y(s.ms)}`);
  });
  if (cur.length) segs.push(cur.join(" "));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="HTTP response time history">
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} className="axis" />
      <text x={P} y={12} className="axis-t">{Math.round(max)} ms</text>
      {segs.map((p, i) => <polyline key={i} points={p} className="ln" />)}
      {samples.map((s, i) => s.ms === null
        ? <g key={i}><line x1={x(i)} y1={H - P - 10} x2={x(i)} y2={H - P} className="fail" /><title>unavailable ({s.note ?? "failed"})</title></g>
        : <circle key={i} cx={x(i)} cy={y(s.ms)} r={3} className="pt"><title>{s.ms.toFixed(1)} ms</title></circle>)}
    </svg>
  );
}
