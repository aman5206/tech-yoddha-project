"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ScatterChart,
  Scatter,
  ZAxis,
  CartesianGrid,
} from "recharts";
import { useApp } from "../lib/store";
import { getAlerts, getFleetData, Status } from "../lib/api";
import { Async, C, Empty, Kpi, Panel, StatusBadge, TT, useAsync } from "../lib/ui";
import Engine3D from "../components/Engine3D";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Filter,
  Layers,
  Rotate3d,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Wrench,
  Zap,
} from "lucide-react";

export default function FleetCommandPage() {
  const { setEngine } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fleet = getFleetData();
  const alerts = useAsync(getAlerts, []);

  const pie = [
    ["Healthy", fleet.healthy, C.HEALTHY],
    ["Monitor / Warning", fleet.attention, C.WARNING],
    ["Critical", fleet.critical, C.CRITICAL],
  ] as const;

  const bins = Array.from({ length: 6 }, (_, i) => ({
    range: i === 5 ? "125+" : `${i * 25}–${i * 25 + 24}`,
    count: 0,
  }));
  fleet.engines.forEach((e) => {
    bins[Math.min(5, Math.floor(e.predicted_rul / 25))].count++;
  });

  // Risk matrix scatter points: X = RUL, Y = Health Score, Z = Anomaly Score
  const scatterData = fleet.engines.slice(0, 40).map((e) => ({
    id: `ENG-${e.engine_id}`,
    engineId: e.engine_id,
    rul: Math.round(e.predicted_rul),
    healthScore: e.health_score,
    anomaly: e.anomaly_score,
    status: e.health_status,
  }));

  const filteredEngines = fleet.engines
    .filter((e) => filter === "ALL" || e.health_status === filter)
    .filter((e) => searchQuery === "" || `ENG-${e.engine_id}`.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleOpenTwin = (id: number) => {
    setEngine(id);
    router.push("/twin");
  };

  return (
    <div className="main">
      {/* Fleet Header */}
      <div className="ph">
        <div>
          <h1>Fleet Command Center</h1>
          <p className="empty">
            Real-time fleet health monitoring, remaining useful life predictions, and risk classification across 100 turbofan units.
          </p>
        </div>
        <div className="filters">
          <Link href="/twin" className="btn dark">
            <Rotate3d size={16} />
            <span>Open 3D Digital Twin Studio</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpis">
        <Kpi label="Monitored Engines" value={fleet.total} />
        <Kpi label="Healthy Powerplants" value={fleet.healthy} />
        <Kpi label="Requiring Attention" value={fleet.attention} />
        <Kpi label="Critical Risk (P1)" value={fleet.critical} />
        <Kpi label="Average Predicted RUL" value={`${fleet.average_rul} cycles`} />
      </div>

      {/* Featured Engine Digital Twin Hero Card */}
      <section className="panel" style={{ background: "linear-gradient(135deg, #101c28 0%, #0d1721 100%)", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px", alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, marginBottom: "12px" }}>
              <Sparkles size={14} />
              <span>SIGNATURE 3D DIGITAL TWIN PREVIEW</span>
            </div>
            <h2 style={{ fontSize: "22px", margin: "0 0 10px" }}>CFM-56 Commercial High-Bypass Turbofan</h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, margin: "0 0 16px" }}>
              Fully articulated 3D aerospace digital twin featuring 24 titanium wide-chord fan blades, 9-stage HPC blisks, annular combustor with 18 fuel injectors, single-crystal HPT rotors, and dual-spool kinematics mapped to 21 NASA C-MAPSS telemetry stations.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn dark" onClick={() => handleOpenTwin(fleet.engines[0]?.engine_id ?? 1)}>
                <Rotate3d size={16} />
                <span>Launch Interactive Twin Studio</span>
              </button>
              <Link href="/compare" className="btn">
                <Layers size={16} />
                <span>Compare Multi-Engine</span>
              </Link>
            </div>
          </div>
          <div style={{ height: "240px", borderRadius: "8px", overflow: "hidden", border: "1px solid #1e293b" }}>
            <Engine3D height={240} speed={0.9} showToolbar={false} />
          </div>
        </div>
      </section>

      {/* Visualizations Grid */}
      <div className="grid2">
        <Panel title="Fleet Health Distribution">
          <div style={{ height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pie.map(([name, value]) => ({ name, value }))}
                  dataKey="value"
                  innerRadius={65}
                  outerRadius={100}
                  stroke="#121C26"
                >
                  {pie.map(([n, , c]) => (
                    <Cell key={n} fill={c} />
                  ))}
                </Pie>
                <Tooltip {...TT} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="legend" style={{ justifyContent: "center" }}>
            {pie.map(([n, v, c]) => (
              <span key={n}>
                <i style={{ background: c }} />
                {n}: <b>{v}</b>
              </span>
            ))}
          </p>
        </Panel>

        <Panel title="Fleet Remaining Useful Life (RUL) Bins">
          <div style={{ height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={bins}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="range" stroke={C.muted} />
                <YAxis stroke={C.muted} width={36} allowDecimals={false} />
                <Tooltip {...TT} />
                <Bar dataKey="count" name="Monitored Engines" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="empty" style={{ textAlign: "center" }}>
            Operating cycles remaining prior to recommended shop inspection.
          </p>
        </Panel>
      </div>

      {/* Risk-Ranked Engine Queue */}
      <section className="panel">
        <div className="ph">
          <h2>Risk-Prioritized Monitored Engines</h2>
          <div className="filters">
            <input
              type="text"
              placeholder="Search ENG-..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "140px" }}
            />
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
              <option value="ALL">All Statuses</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warning</option>
              <option value="MONITOR">Monitor</option>
              <option value="HEALTHY">Healthy</option>
            </select>
          </div>
        </div>

        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Engine Unit</th>
                <th>Observed Cycle</th>
                <th>Health Score</th>
                <th>Predicted RUL</th>
                <th>Status</th>
                <th>Critical Subsystem</th>
                <th>Inspection Target</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEngines.slice(0, 15).map((e) => (
                <tr key={e.engine_id} className="click" onClick={() => handleOpenTwin(e.engine_id)}>
                  <td>
                    <b>ENG-{e.engine_id}</b>
                  </td>
                  <td>{e.cycle} / {e.max_cycle}</td>
                  <td>
                    <span style={{ color: e.health_score > 75 ? "#22c55e" : e.health_score > 50 ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>
                      {e.health_score} / 100
                    </span>
                  </td>
                  <td>
                    <b style={{ color: e.predicted_rul < 30 ? "#ef4444" : "#e2e8f0" }}>
                      {Math.round(e.predicted_rul)} cycles
                    </b>
                  </td>
                  <td>
                    <StatusBadge s={e.health_status} />
                  </td>
                  <td>{e.critical_component}</td>
                  <td>Within {e.inspect_within_cycles} cycles ({e.inspect_by})</td>
                  <td>
                    <button
                      className="btn small"
                      onClick={(evt) => {
                        evt.stopPropagation();
                        handleOpenTwin(e.engine_id);
                      }}
                    >
                      <span>Twin</span>
                      <ChevronRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
