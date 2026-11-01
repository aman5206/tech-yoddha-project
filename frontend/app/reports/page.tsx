"use client";
import React, { useState } from "react";
import { useApp } from "../../lib/store";
import { generateEngineCycleData, getFleetData } from "../../lib/api";
import { StatusBadge } from "../../lib/ui";
import { FileText, Printer, Download, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function ReportsPage() {
  const { engine, setEngine } = useApp();
  const [cycle, setCycle] = useState(130);

  const data = generateEngineCycleData(engine, cycle);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="main">
      <div className="ph">
        <div>
          <h1>Engine Health & Airworthiness Reports</h1>
          <p className="empty">
            Generate and export technical compliance reports, failure risk audits, and borescope inspection recommendations.
          </p>
        </div>
        <div className="filters">
          <label className="inline">
            Select Engine:
            <select value={engine} onChange={(e) => setEngine(Number(e.target.value))}>
              {Array.from({ length: 50 }, (_, i) => i + 1).map((id) => (
                <option key={id} value={id}>ENG-{id}</option>
              ))}
            </select>
          </label>
          <button className="btn dark" onClick={handlePrint}>
            <Printer size={15} />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document */}
      <div className="panel" style={{ padding: "32px", background: "#0f172a", border: "1px solid #334155" }}>
        {/* Document Header */}
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #334155", paddingBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="brand-badge" style={{ width: "32px", height: "32px", fontSize: "14px" }}>AG</span>
              <h2 style={{ fontSize: "22px", margin: 0 }}>AEROGUARD AI — TECHNICAL HEALTH AUDIT</h2>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: "6px 0 0" }}>
              National Aerospace Engineering Predictive Maintenance Program | Team Tech Yodhas
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "13px", color: "#94a3b8" }}>
            <div>Report Ref: <b>AG-REP-{engine}-{cycle}</b></div>
            <div>Date Generated: <b>{new Date().toISOString().slice(0, 10)}</b></div>
            <div>Lead Auditor: <b>Aditya Bijore</b></div>
          </div>
        </div>

        {/* Engine Overview Grid */}
        <div className="cards3" style={{ margin: "24px 0" }}>
          <div className="panel" style={{ background: "#1e293b" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>Powerplant Unit</span>
            <div style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}>CFM-56 Turbofan (ENG-{engine})</div>
            <small style={{ color: "#94a3b8" }}>Current Cycle: {cycle} / {data.maxCycle}</small>
          </div>

          <div className="panel" style={{ background: "#1e293b" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>Health Index Score</span>
            <div style={{ fontSize: "20px", fontWeight: 600, color: data.healthScore > 75 ? "#22c55e" : "#f59e0b", marginTop: "4px" }}>
              {data.healthScore} / 100
            </div>
            <small>Anomaly Score: {data.anomalyScore}</small>
          </div>

          <div className="panel" style={{ background: "#1e293b" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>Remaining Useful Life (RUL)</span>
            <div style={{ fontSize: "20px", fontWeight: 600, color: "#38bdf8", marginTop: "4px" }}>
              {data.predictedRul} Cycles
            </div>
            <small>Status: <StatusBadge s={data.healthStatus} /></small>
          </div>
        </div>

        {/* Section 1: Executive Engineering Assessment */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ color: "#f8fafc", borderBottom: "1px solid #334155", paddingBottom: "6px" }}>
            1. Executive Engineering Assessment
          </h3>
          <p style={{ color: "#cbd5e1", lineHeight: 1.6, fontSize: "14px" }}>
            Telemetry replay for engine unit <b>ENG-{engine}</b> at operating cycle <b>{cycle}</b> reveals an ongoing
            degradation profile of {(data.progress * 100).toFixed(1)}% of observed operational life.
            Machine learning ensemble (LSTM, GRU, XGBoost) projects approximately <b>{data.predictedRul} flight cycles</b>{" "}
            remaining prior to reaching the critical hot-section maintenance threshold (25 cycles).
          </p>
        </div>

        {/* Section 2: Critical Sensor Station Analysis */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ color: "#f8fafc", borderBottom: "1px solid #334155", paddingBottom: "6px" }}>
            2. Station Sensor Readings & z-Score Deviations
          </h3>
          <table>
            <thead>
              <tr>
                <th>Station</th>
                <th>Sensor Parameter</th>
                <th>Baseline</th>
                <th>Recorded Value</th>
                <th>Deviation</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.latestSensors).slice(0, 8).map(([k, s]) => (
                <tr key={k}>
                  <td><b>{s.station}</b></td>
                  <td>{s.label}</td>
                  <td>{s.baseline} {s.unit}</td>
                  <td><b>{s.value} {s.unit}</b></td>
                  <td style={{ color: s.pct > 0 ? "#f87171" : "#38bdf8" }}>
                    {s.pct > 0 ? `+${s.pct}%` : `${s.pct}%`} (z={s.z})
                  </td>
                  <td>
                    {s.flag ? (
                      <span style={{ color: "#ef4444", fontWeight: 600 }}>EXCEEDED</span>
                    ) : (
                      <span style={{ color: "#22c55e" }}>NOMINAL</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: AI Predictive Maintenance Recommendation */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ color: "#f8fafc", borderBottom: "1px solid #334155", paddingBottom: "6px" }}>
            3. AI Predictive Maintenance Recommendation
          </h3>
          <div style={{ background: "#1e293b", padding: "16px", borderRadius: "6px", borderLeft: "4px solid #38bdf8" }}>
            <div style={{ fontWeight: 600, color: "#f8fafc", marginBottom: "6px" }}>
              Action Plan: {data.maintenanceAction}
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", lineHeight: 1.5 }}>
              Inspection should be scheduled within {Math.max(0, data.predictedRul - 10)} operating cycles.
              Specialized borescope probes are advised for High-Pressure Compressor stage 7-9 blades and High-Pressure
              Turbine leading-edge thermal barrier coatings.
            </p>
          </div>
        </div>

        {/* Sign-off Footer */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #334155" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Lead AI Systems Engineer</div>
            <div style={{ marginTop: "24px", fontWeight: 600 }}>Aditya Bijore</div>
            <small style={{ color: "#64748b" }}>Team Tech Yodhas — Lead Analyst</small>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Quality Assurance & Verification</div>
            <div style={{ marginTop: "24px", fontWeight: 600 }}>Autonomous AI Verification Engine</div>
            <small style={{ color: "#64748b" }}>NASA C-MAPSS Validation Standard</small>
          </div>
        </div>
      </div>
    </div>
  );
}

