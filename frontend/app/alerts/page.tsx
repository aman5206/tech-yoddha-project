"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, ackAlert, getAlerts, getSensors } from "../../lib/api";
import { useApp } from "../../lib/store";
import { Async, Empty, Panel, StatusBadge, useAsync } from "../../lib/ui";
import { Rotate3d, CheckCircle2, ShieldAlert, Sparkles, ChevronRight } from "lucide-react";

const TABS = ["Critical", "Warning", "Informational", "History"] as const;

function Detail({ a, onInspect }: { a: Alert; onInspect: (id: number) => void }) {
  const id = parseInt(a.engine_id.replace(/\D/g, ""), 10);
  const s = useAsync(() => getSensors(id), [id]);
  return (
    <Panel title={`Alert #${a.alert_id} Root Cause Investigation`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <StatusBadge s={a.severity} />
          <b style={{ marginLeft: "10px", fontSize: "15px" }}>{a.engine_id}</b>
          <span style={{ color: "#94a3b8", fontSize: "12px", marginLeft: "10px" }}>
            Raised {new Date(a.created_at).toLocaleString()}
          </span>
        </div>
        <button className="btn dark" onClick={() => onInspect(id)}>
          <Rotate3d size={15} />
          <span>Launch 3D Twin for ENG-{id}</span>
        </button>
      </div>

      <p style={{ color: "#f8fafc", fontSize: "14px", lineHeight: 1.5 }}>
        <b>Anomaly Trigger:</b> {a.description}
      </p>

      <Async s={s}>{(d) => (
        <div style={{ background: "#142232", padding: "14px", borderRadius: "6px", marginTop: "12px", border: "1px solid #1e2f42" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: "12px", textTransform: "uppercase", color: "#38bdf8" }}>
            Telemetry Deviation Evidence (Station Stations)
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
            {Object.values(d.latest)
              .sort((x, y) => Math.abs(y.z) - Math.abs(x.z))
              .slice(0, 4)
              .map((v) => (
                <div key={v.label} style={{ background: "#0e1722", padding: "8px 10px", borderRadius: "4px", fontSize: "12px" }}>
                  <div style={{ color: "#94a3b8" }}>{v.label}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <b>{v.value} {v.unit}</b>
                    <span style={{ color: v.flag ? "#ef4444" : "#38bdf8" }}>
                      {v.pct > 0 ? `+${v.pct}%` : `${v.pct}%`} (z={v.z})
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}</Async>
    </Panel>
  );
}

export default function AlertsPage() {
  const router = useRouter();
  const { models, fleet, setEngine } = useApp();
  const alerts = useAsync(getAlerts, []);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Critical");
  const [eng, setEng] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sel, setSel] = useState<Alert | null>(null);

  const info = [
    `Model bundle ${models.data?.version ?? "2.4.0"} active with verified LSTM, GRU, and XGBoost predictors`,
    `Fleet snapshot synchronized across 100 turbofan engine units`,
    "Telemetry source: NASA C-MAPSS FD001 simulated run-to-failure benchmarks",
  ];

  const ack = (id: number) => ackAlert(id).then(() => alerts.reload());

  const handleInspectInTwin = (engineId: number) => {
    setEngine(engineId);
    router.push("/twin");
  };

  return (
    <div className="main">
      <div className="ph">
        <div>
          <h1>Alert and Anomaly Management</h1>
          <p className="empty">
            Real-time threshold breaches, rapid root cause investigation, and one-click 3D engine navigation.
          </p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "on" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="filters wrap">
        <input
          placeholder="Filter by Engine ID (ENG-24)"
          value={eng}
          onChange={(e) => setEng(e.target.value)}
          aria-label="Filter by engine"
        />
        <label className="inline">
          From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="inline">
          To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {tab === "Informational" ? (
        <Panel title="System & Verification Events">
          {info.map((i) => (
            <div className="row" key={i}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span>{i}</span>
            </div>
          ))}
        </Panel>
      ) : (
        <Panel title={tab === "History" ? "Acknowledged Alert Archive" : `Active ${tab} Alerts Queue`}>
          <Async s={alerts}>
            {(all) => {
              const rows = all.filter(
                (a) =>
                  (tab === "History"
                    ? a.status !== "open"
                    : a.status === "open" && a.severity === tab.toUpperCase()) &&
                  (!eng || a.engine_id.toLowerCase().includes(eng.toLowerCase())) &&
                  (!from || a.created_at.slice(0, 10) >= from) &&
                  (!to || a.created_at.slice(0, 10) <= to)
              );
              return rows.length === 0 ? (
                <Empty>No {tab.toLowerCase()} alerts matching current filters.</Empty>
              ) : (
                rows.map((a) => (
                  <div className="row" key={a.alert_id}>
                    <StatusBadge s={a.severity} />
                    <button className="link" onClick={() => setSel(a)}>
                      <b>{a.engine_id}</b>: {a.description}
                    </button>
                    <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        className="btn small"
                        onClick={() => handleInspectInTwin(parseInt(a.engine_id.replace(/\D/g, ""), 10))}
                      >
                        <Rotate3d size={12} />
                        <span>3D Twin</span>
                      </button>
                      {a.status === "open" ? (
                        <button className="btn small dark" onClick={() => ack(a.alert_id)}>
                          Acknowledge
                        </button>
                      ) : (
                        <span className="empty">Acknowledged</span>
                      )}
                    </div>
                  </div>
                ))
              );
            }}
          </Async>
        </Panel>
      )}

      {sel && <Detail a={sel} onInspect={handleInspectInTwin} />}
    </div>
  );
}
