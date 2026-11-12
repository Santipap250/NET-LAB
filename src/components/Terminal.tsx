import { useEffect, useRef, useState } from "react";
import type { Ctx, LogEntry } from "../types";
import { copyText } from "../lib/export";

export default function Terminal({ ctx }: { ctx: Ctx }) {
  const { store, update, log } = ctx;
  const [paused, setPaused] = useState(false);
  const [snap, setSnap] = useState<LogEntry[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const shown = (paused ? snap : store.events).slice(-200);

  useEffect(() => {
    if (store.settings.autoScroll && !paused && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [shown.length, paused, store.settings.autoScroll]);

  return (
    <section className="card term" aria-label="Live terminal">
      <h2>Live terminal</h2>
      <div className="row">
        <button className="btn" onClick={() => { if (!paused) setSnap(store.events); setPaused(!paused); }}>{paused ? "Resume" : "Pause"}</button>
        <button className="btn" onClick={() => update((s) => ({ ...s, settings: { ...s.settings, autoScroll: !s.settings.autoScroll } }))}>Auto-scroll: {store.settings.autoScroll ? "on" : "off"}</button>
        <button className="btn" onClick={async () => log((await copyText(shown.map((e) => `${e.ts} [${e.level}] ${e.msg}`).join("\n"))) ? "ok" : "warn", "Logs copied")}>Copy</button>
        <button className="btn" onClick={() => update((s) => ({ ...s, events: [] }))}>Clear</button>
      </div>
      <div className="log mono" ref={box} role="log" aria-live="off">
        {shown.length === 0 && <p className="muted">No events yet.</p>}
        {shown.map((e, i) => (
          <div key={i} className={`l-${e.level}`}><span className="muted">{e.ts.slice(11, 19)}</span> [{e.level.toUpperCase()}] {e.msg}</div>
        ))}
        <span className="cursor" aria-hidden="true">▌</span>
      </div>
    </section>
  );
}
