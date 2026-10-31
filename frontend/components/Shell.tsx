"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Activity, BarChart3, Bell, Bot, History, LayoutDashboard, Rotate3d, Search, Settings, ShieldAlert, TrendingDown, User, Wrench } from "lucide-react";
import { useApp } from "../lib/store";
import { getAlerts } from "../lib/api";

const NAV = [
  ["/", "Dashboard", LayoutDashboard], ["/history", "Engine History", History], ["/simulation", "Engine Simulation", Rotate3d],
  ["/prediction", "Failure Prediction", ShieldAlert], ["/rul", "RUL Monitoring", TrendingDown], ["/maintenance", "Maintenance Center", Wrench],
  ["/analytics", "Analytics", BarChart3], ["/alerts", "Alerts Center", Bell], ["/assistant", "AI Assistant", Bot], ["/settings", "Settings", Settings],
] as const;

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { setEngine, sim, fleet } = useApp();
  const [open, setOpen] = useState(0);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { getAlerts().then((a) => setOpen(a.filter((x) => x.status === "open").length)).catch(() => setOpen(0)); }, [sim.points.length, path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  const search = () => {
    const t = q.toLowerCase();
    const n = parseInt(t.replace(/\D/g, ""), 10);
    if (t.includes("alert")) router.push("/alerts");
    else if (t.includes("maint") || t.includes("inspect")) router.push("/maintenance");
    else if (n >= 1 && n <= (fleet.data?.total ?? 100)) { setEngine(n); router.push("/history"); }
    setQ("");
  };

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><b>AeroGuard AI</b><span>Engine health and RUL</span></div>
        <nav aria-label="Main">
          {NAV.map(([href, label, Icon]) => (
            <Link key={href} href={href} className={`nav ${path === href ? "on" : ""}`} aria-current={path === href ? "page" : undefined}>
              <Icon size={18} aria-hidden /><span>{label}</span>
            </Link>))}
        </nav>
        {sim.running && <p className="live"><Activity size={14} aria-hidden /> Simulating: cycle {sim.last?.cycle ?? 1}</p>}
      </aside>
      <div className="content">
        <header className="top">
          <label className="search"><Search size={16} aria-hidden />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search engine number, alerts, maintenance (Ctrl+K)" aria-label="Global search" /></label>
          <span className="demo" title="Data is replayed from the NASA C-MAPSS simulation dataset">DEMO MODE: simulated data, not live telemetry</span>
          <Link href="/alerts" className="bell" aria-label={`${open} open alerts`}><Bell size={18} />{open > 0 && <i>{open}</i>}</Link>
          <details className="profile"><summary aria-label="User profile"><User size={18} /></summary>
            <div><b>Demo operator</b><span>Reliability engineer</span></div></details>
        </header>
        <main className="main">{children}</main>
        <footer className="foot">Predictions are model estimates for human review, not an aviation safety authorization. Thresholds are prototype values.</footer>
      </div>
    </div>
  );
}
