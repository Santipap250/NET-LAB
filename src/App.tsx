import { useCallback, useEffect, useState } from "react";
import type { Ctx, Language, Store, Tab, LogLevel } from "./types";
import { loadStore, saveStore } from "./lib/storage";
import Terminal from "./components/Terminal";
import Overview from "./modules/Overview";
import Diagnose from "./modules/Diagnose";
import Dns from "./modules/Dns";
import Toolkit from "./modules/Toolkit";
import History from "./modules/History";
const NAV: { id: Tab; en: string; th: string; glyph: string }[] = [
  { id: "home", en: "HOME", th: "หน้าหลัก", glyph: "⌂" }, { id: "diagnose", en: "DIAGNOSE", th: "วินิจฉัย", glyph: "◎" }, { id: "dns", en: "DNS", th: "DNS", glyph: "◈" }, { id: "toolkit", en: "TOOLKIT", th: "เครื่องมือ", glyph: "▦" }, { id: "history", en: "HISTORY", th: "ประวัติ", glyph: "◷" },
];
export default function App() {
  const [tab, setTab] = useState<Tab>("home"); const [store, setStore] = useState<Store>(loadStore); const [now, setNow] = useState(new Date()); const [online, setOnline] = useState(navigator.onLine); const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => saveStore(store), [store]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); const on = () => setOnline(true), off = () => setOnline(false); window.addEventListener("online", on); window.addEventListener("offline", off); if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistration().then(r => r?.addEventListener("updatefound", () => setUpdateReady(true))); return () => { clearInterval(t); window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);
  const update = useCallback((fn: (s: Store) => Store) => setStore(fn), []); const log = useCallback((level: LogLevel, msg: string) => setStore(s => ({ ...s, events: [...s.events, { ts: new Date().toISOString(), level, msg }].slice(-500) })), []); const ctx: Ctx = { store, update, log, go: setTab, language: store.settings.language };
  function setLanguage(language: Language) { update(s => ({ ...s, settings: { ...s.settings, language } })); }
  const th = store.settings.language === "th";
  return <div className="app">
    <header className="top"><div className="brand"><span className="radar" aria-hidden="true" /><strong>OBIX NET-LAB <em>X</em></strong><small className="tag">CONTROL YOUR CONNECTION. MASTER YOUR NETWORK.</small></div><div className="top-r"><span className={`dot ${online ? "up" : "down"}`} /><span>{online ? "ONLINE" : "OFFLINE"}</span><span className="mono hide-sm">{now.toLocaleTimeString()}</span><button className="lang" onClick={() => setLanguage(th ? "en" : "th")} aria-label="Switch language">{th ? "EN" : "ไทย"}</button><button className="btn settings-btn" onClick={() => setTab("diagnose")}>{th ? "ตั้งค่า" : "Settings"}</button></div></header>
    <nav className="nav" aria-label="Primary navigation">{NAV.map(n => <button key={n.id} className={tab === n.id ? "active" : ""} aria-current={tab === n.id ? "page" : undefined} onClick={() => setTab(n.id)}><span className="nav-glyph">{n.glyph}</span><span>{th ? n.th : n.en}</span></button>)}</nav>
    {updateReady && <div className="update-banner">{th ? "มีเวอร์ชันใหม่พร้อมใช้" : "A new version is ready"}<button className="btn" onClick={() => window.location.reload()}>{th ? "โหลดใหม่" : "Reload"}</button></div>}
    <main className="main">{tab === "home" && <Overview ctx={ctx} />}{tab === "diagnose" && <Diagnose ctx={ctx} />}{tab === "dns" && <Dns ctx={ctx} />}{tab === "toolkit" && <Toolkit ctx={ctx} />}{tab === "history" && <History ctx={ctx} />}</main><aside className="side"><Terminal ctx={ctx} /></aside>
  </div>;
}
