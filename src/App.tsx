import { useCallback, useEffect, useState } from "react";
import type { Ctx, LogLevel, Store, Tab } from "./types";
import { loadStore, saveStore } from "./lib/storage";
import Terminal from "./components/Terminal";
import Overview from "./modules/Overview";
import Dns from "./modules/Dns";
import Latency from "./modules/Latency";
import Http from "./modules/Http";
import Route from "./modules/Route";
import Monitor from "./modules/Monitor";

const NAV: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "dns", label: "DNS" },
  { id: "latency", label: "Latency" },
  { id: "http", label: "HTTP" },
  { id: "route", label: "Route" },
  { id: "monitor", label: "System" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [store, setStore] = useState<Store>(loadStore);
  const [now, setNow] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => saveStore(store), [store]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    const on = () => setOnline(true), off = () => setOnline(false);
    const vis = () => { document.documentElement.dataset.hidden = String(document.hidden); };
    window.addEventListener("online", on); window.addEventListener("offline", off);
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); window.removeEventListener("online", on); window.removeEventListener("offline", off); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const update = useCallback((fn: (s: Store) => Store) => setStore(fn), []);
  const log = useCallback((level: LogLevel, msg: string) =>
    setStore((s) => ({ ...s, events: [...s.events, { ts: new Date().toISOString(), level, msg }].slice(-500) })), []);
  const ctx: Ctx = { store, log, update, go: setTab };

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><span className="radar" aria-hidden="true" /><b>OBIX</b> NET-LAB
          <small className="tag">NETWORK INTELLIGENCE // DIAGNOSTICS // ANALYSIS</small></div>
        <div className="top-r">
          <span className={`dot ${online ? "up" : "down"}`} aria-hidden="true" />
          <span>{online ? "ONLINE" : "OFFLINE"}</span>
          <span className="mono hide-sm">{now.toLocaleTimeString()}</span>
          <span className="hide-sm muted">THEME: GREEN-OPS</span>
          <button className="btn" onClick={() => setTab("monitor")} aria-label="Settings">Settings</button>
        </div>
      </header>
      <nav className="nav" aria-label="Modules">
        {NAV.map((n) => (
          <button key={n.id} className={tab === n.id ? "active" : ""} aria-current={tab === n.id ? "page" : undefined} onClick={() => setTab(n.id)}>{n.label}</button>
        ))}
      </nav>
      <main className="main">
        {tab === "overview" && <Overview ctx={ctx} />}
        {tab === "dns" && <Dns ctx={ctx} />}
        {tab === "latency" && <Latency ctx={ctx} />}
        {tab === "http" && <Http ctx={ctx} />}
        {tab === "route" && <Route ctx={ctx} />}
        {tab === "monitor" && <Monitor ctx={ctx} />}
      </main>
      <aside className="side"><Terminal ctx={ctx} /></aside>
    </div>
  );
}
