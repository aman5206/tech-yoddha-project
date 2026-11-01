"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Gauge,
  HelpCircle,
  History,
  Info,
  LayoutDashboard,
  Layers,
  Rotate3d,
  Search,
  Settings,
  ShieldAlert,
  Sliders,
  TrendingDown,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import { useApp } from "../lib/store";
import { getAlerts } from "../lib/api";

const NAV_GROUPS = [
  {
    title: "OPERATIONS & TWIN",
    items: [
      { href: "/", label: "Fleet Command", icon: LayoutDashboard },
      { href: "/twin", label: "3D Digital Twin", icon: Rotate3d, highlight: true },
      { href: "/compare", label: "Engine Comparison", icon: Layers },
      { href: "/simulation", label: "Simulation Lab", icon: Activity },
    ],
  },
  {
    title: "AI & PREDICTIVE ANALYTICS",
    items: [
      { href: "/sensors", label: "Sensor Intelligence", icon: Gauge },
      { href: "/prediction", label: "Failure Prediction", icon: ShieldAlert },
      { href: "/rul", label: "RUL Monitoring", icon: TrendingDown },
      { href: "/analytics", label: "Fleet Analytics", icon: BarChart3 },
      { href: "/scenario", label: "What-If Lab", icon: Sliders },
    ],
  },
  {
    title: "ENGINEERING WORKFLOW",
    items: [
      { href: "/maintenance", label: "Maintenance Center", icon: Wrench },
      { href: "/alerts", label: "Alerts & Anomalies", icon: Bell },
      { href: "/assistant", label: "AI Copilot", icon: Bot },
      { href: "/reports", label: "Reports Center", icon: FileText },
      { href: "/data-quality", label: "Data Quality", icon: Database },
      { href: "/transparency", label: "Model Transparency", icon: Info },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { setEngine, sim, fleet } = useApp();
  const [openAlerts, setOpenAlerts] = useState(0);
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAlerts()
      .then((a) => setOpenAlerts(a.filter((x) => x.status === "open").length))
      .catch(() => setOpenAlerts(0));
  }, [sim.points.length, path]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const handleSearch = () => {
    const t = q.toLowerCase().trim();
    if (!t) return;
    const n = parseInt(t.replace(/\D/g, ""), 10);
    if (t.includes("alert")) router.push("/alerts");
    else if (t.includes("twin") || t.includes("3d")) router.push("/twin");
    else if (t.includes("comp") || t.includes("radar")) router.push("/compare");
    else if (t.includes("sensor")) router.push("/sensors");
    else if (t.includes("maint") || t.includes("work")) router.push("/maintenance");
    else if (t.includes("rul")) router.push("/rul");
    else if (t.includes("pred")) router.push("/prediction");
    else if (t.includes("report")) router.push("/reports");
    else if (t.includes("copilot") || t.includes("ai")) router.push("/assistant");
    else if (n >= 1 && n <= 100) {
      setEngine(n);
      router.push("/twin");
    }
    setQ("");
  };

  return (
    <div className={`shell ${collapsed ? "collapsed" : ""}`}>
      {/* Sidebar Navigation */}
      <aside className={`side ${collapsed ? "side-collapsed" : ""}`}>
        <div className="brand">
          <div className="brand-logo">
            <span className="brand-badge">AG</span>
            {!collapsed && (
              <div>
                <b>AeroGuard AI</b>
                <span className="brand-sub">Team Tech Yodhas</span>
              </div>
            )}
          </div>
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav aria-label="Main Navigation">
          {NAV_GROUPS.map((grp) => (
            <div key={grp.title} className="nav-group">
              {!collapsed && <span className="nav-group-title">{grp.title}</span>}
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive = path === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav ${isActive ? "on" : ""} ${item.highlight ? "nav-highlight" : ""}`}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon size={18} aria-hidden />
                    {!collapsed && <span>{item.label}</span>}
                    {item.href === "/alerts" && openAlerts > 0 && (
                      <span className="nav-pill">{openAlerts}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Live Simulation Indicator */}
        {!collapsed && sim.running && (
          <div className="live-sim-box">
            <div className="live">
              <Activity size={14} className="animate-pulse" />
              <span>Replaying ENG-{sim.last?.engine_id ?? 24}</span>
            </div>
            <small>Cycle {sim.last?.cycle ?? 1} / {sim.last?.max_cycle ?? 180}</small>
          </div>
        )}

        {/* Team Leader Credit */}
        {!collapsed && (
          <div className="team-credit">
            <span>Tech Yodhas</span>
            <small>Lead: Aditya Bijore</small>
          </div>
        )}
      </aside>

      {/* Main App Content Area */}
      <div className="content">
        <header className="top">
          <label className="search">
            <Search size={16} aria-hidden />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search engine (ENG-24), sensors, RUL, alerts... (Ctrl+K)"
              aria-label="Global search"
            />
          </label>

          {/* Data Source Badge */}
          <div className="data-source-pill" title="NASA C-MAPSS FD001 Turbofan Dataset">
            <span className="source-dot" />
            <span>NASA C-MAPSS FD001</span>
          </div>

          {/* Alerts Bell */}
          <Link href="/alerts" className="bell" aria-label={`${openAlerts} open alerts`}>
            <Bell size={18} />
            {openAlerts > 0 && <i>{openAlerts}</i>}
          </Link>

          {/* User Profile */}
          <details className="profile">
            <summary aria-label="User profile">
              <User size={18} />
            </summary>
            <div>
              <b>Aditya Bijore</b>
              <span>Aerospace Lead & Chief Analyst</span>
              <small>Team Tech Yodhas</small>
            </div>
          </details>
        </header>

        <main className="main">{children}</main>

        <footer className="foot">
          <div className="foot-left">
            <span>AeroGuard AI — Aerospace Predictive Maintenance & Digital Twin Platform</span>
            <span>•</span>
            <span>National Aerospace Engineering Submission</span>
          </div>
          <div className="foot-right">
            <span>Model estimations for human engineering review. Non-operational prototype.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
