"use client";
import React, { useState } from "react";
import Engine3D from "../../components/Engine3D";
import { generateEngineCycleData } from "../../lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { TT, C, StatusBadge } from "../../lib/ui";
import { Layers, RotateCcw, AlertTriangle, ShieldCheck, TrendingDown } from "lucide-react";

export default function ComparePage() {
  const [engineA, setEngineA] = useState(12);
  const [engineB, setEngineB] = useState(24);
  const [engineC, setEngineC] = useState(38);
  const [showThree, setShowThree] = useState(true);

  const dataA = generateEngineCycleData(engineA, 140);
  const dataB = generateEngineCycleData(engineB, 140);
  const dataC = generateEngineCycleData(engineC, 140);

  // Radar chart data for component health comparison
  const radarData = [
    { component: "Fan", EngineA: Math.round(100 - dataA.progress * 45), EngineB: Math.round(100 - dataB.progress * 45), EngineC: Math.round(100 - dataC.progress * 45) },
    { component: "LPC", EngineA: Math.round(100 - dataA.progress * 60), EngineB: Math.round(100 - dataB.progress * 60), EngineC: Math.round(100 - dataC.progress * 60) },
    { component: "HPC", EngineA: Math.round(100 - dataA.progress * 85), EngineB: Math.round(100 - dataB.progress * 85), EngineC: Math.round(100 - dataC.progress * 85) },
    { component: "Combustor", EngineA: Math.round(100 - dataA.progress * 78), EngineB: Math.round(100 - dataB.progress * 78), EngineC: Math.round(100 - dataC.progress * 78) },
    { component: "HPT", EngineA: Math.round(100 - dataA.progress * 88), EngineB: Math.round(100 - dataB.progress * 88), EngineC: Math.round(100 - dataC.progress * 88) },
    { component: "LPT", EngineA: Math.round(100 - dataA.progress * 65), EngineB: Math.round(100 - dataB.progress * 65), EngineC: Math.round(100 - dataC.progress * 65) },
  ];

  const compareBarData = [
    { metric: "Health Index", [`ENG-${engineA}`]: dataA.healthScore, [`ENG-${engineB}`]: dataB.healthScore, [`ENG-${engineC}`]: dataC.healthScore },
    { metric: "Predicted RUL", [`ENG-${engineA}`]: dataA.predictedRul, [`ENG-${engineB}`]: dataB.predictedRul, [`ENG-${engineC}`]: dataC.predictedRul },
    { metric: "Anomaly Score (%)", [`ENG-${engineA}`]: Math.round(dataA.anomalyScore * 100), [`ENG-${engineB}`]: Math.round(dataB.anomalyScore * 100), [`ENG-${engineC}`]: Math.round(dataC.anomalyScore * 100) },
  ];

  return (
    <div className="main">
      <div className="ph">
        <div>
          <h1>Engine Comparison Lab</h1>
          <p className="empty">Side-by-side multi-engine digital twin comparison, sensor variance, and RUL trajectories.</p>
        </div>
        <div className="filters">
          <label className="inline">
            Show 3 Engines
            <input type="checkbox" checked={showThree} onChange={(e) => setShowThree(e.target.checked)} />
          </label>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="cards3">
        <div className="panel" style={{ borderTop: "3px solid #38bdf8" }}>
          <div className="ph">
            <h3>Engine Unit Alpha</h3>
            <select value={engineA} onChange={(e) => setEngineA(Number(e.target.value))}>
              {Array.from({ length: 50 }, (_, i) => i + 1).map((id) => (
                <option key={id} value={id}>ENG-{id}</option>
              ))}
            </select>
          </div>
          <div className="row">
            <span>Status</span>
            <StatusBadge s={dataA.healthStatus} />
          </div>
          <div className="row">
            <span>Predicted RUL</span>
            <b>{dataA.predictedRul} cycles</b>
          </div>
          <div className="row">
            <span>Health Score</span>
            <b>{dataA.healthScore} / 100</b>
          </div>
        </div>

        <div className="panel" style={{ borderTop: "3px solid #f59e0b" }}>
          <div className="ph">
            <h3>Engine Unit Beta</h3>
            <select value={engineB} onChange={(e) => setEngineB(Number(e.target.value))}>
              {Array.from({ length: 50 }, (_, i) => i + 1).map((id) => (
                <option key={id} value={id}>ENG-{id}</option>
              ))}
            </select>
          </div>
          <div className="row">
            <span>Status</span>
            <StatusBadge s={dataB.healthStatus} />
          </div>
          <div className="row">
            <span>Predicted RUL</span>
            <b>{dataB.predictedRul} cycles</b>
          </div>
          <div className="row">
            <span>Health Score</span>
            <b>{dataB.healthScore} / 100</b>
          </div>
        </div>

        {showThree && (
          <div className="panel" style={{ borderTop: "3px solid #ef4444" }}>
            <div className="ph">
              <h3>Engine Unit Gamma</h3>
              <select value={engineC} onChange={(e) => setEngineC(Number(e.target.value))}>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((id) => (
                  <option key={id} value={id}>ENG-{id}</option>
                ))}
              </select>
            </div>
            <div className="row">
              <span>Status</span>
              <StatusBadge s={dataC.healthStatus} />
            </div>
            <div className="row">
              <span>Predicted RUL</span>
              <b>{dataC.predictedRul} cycles</b>
            </div>
            <div className="row">
              <span>Health Score</span>
              <b>{dataC.healthScore} / 100</b>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side 3D Engines */}
      <div className={showThree ? "cards3" : "grid2"}>
        <div className="panel" style={{ padding: "8px" }}>
          <div style={{ padding: "8px", fontWeight: 600, color: "#38bdf8" }}>
            ENG-{engineA} (RUL: {dataA.predictedRul})
          </div>
          <Engine3D height={280} speed={0.8} />
        </div>
        <div className="panel" style={{ padding: "8px" }}>
          <div style={{ padding: "8px", fontWeight: 600, color: "#f59e0b" }}>
            ENG-{engineB} (RUL: {dataB.predictedRul})
          </div>
          <Engine3D height={280} speed={0.8} />
        </div>
        {showThree && (
          <div className="panel" style={{ padding: "8px" }}>
            <div style={{ padding: "8px", fontWeight: 600, color: "#ef4444" }}>
              ENG-{engineC} (RUL: {dataC.predictedRul})
            </div>
            <Engine3D height={280} speed={0.8} />
          </div>
        )}
      </div>

      {/* Analytics Comparison Charts */}
      <div className="grid2">
        <section className="panel">
          <h2>Component Health Radar Comparison</h2>
          <div style={{ height: 320 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="component" stroke="#94a3b8" />
                <PolarRadiusAxis stroke="#64748b" domain={[0, 100]} />
                <Radar name={`ENG-${engineA}`} dataKey="EngineA" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.25} />
                <Radar name={`ENG-${engineB}`} dataKey="EngineB" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
                {showThree && (
                  <Radar name={`ENG-${engineC}`} dataKey="EngineC" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} />
                )}
                <Legend />
                <Tooltip {...TT} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <h2>Sensor Deviation Delta (T30, Ps30, T50)</h2>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Sensor Station</th>
                  <th>ENG-{engineA}</th>
                  <th>ENG-{engineB}</th>
                  {showThree && <th>ENG-{engineC}</th>}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>T30 HPC Temp (°R)</td>
                  <td style={{ color: dataA.latestSensors.s3?.pct > 2 ? "#ef4444" : "#e2e8f0" }}>
                    {dataA.latestSensors.s3?.value} ({dataA.latestSensors.s3?.pct > 0 ? "+" : ""}{dataA.latestSensors.s3?.pct}%)
                  </td>
                  <td style={{ color: dataB.latestSensors.s3?.pct > 2 ? "#ef4444" : "#e2e8f0" }}>
                    {dataB.latestSensors.s3?.value} ({dataB.latestSensors.s3?.pct > 0 ? "+" : ""}{dataB.latestSensors.s3?.pct}%)
                  </td>
                  {showThree && (
                    <td style={{ color: dataC.latestSensors.s3?.pct > 2 ? "#ef4444" : "#e2e8f0" }}>
                      {dataC.latestSensors.s3?.value} ({dataC.latestSensors.s3?.pct > 0 ? "+" : ""}{dataC.latestSensors.s3?.pct}%)
                    </td>
                  )}
                </tr>
                <tr>
                  <td>Ps30 HPC Static Pres (psia)</td>
                  <td>{dataA.latestSensors.s11?.value} ({dataA.latestSensors.s11?.pct}%)</td>
                  <td>{dataB.latestSensors.s11?.value} ({dataB.latestSensors.s11?.pct}%)</td>
                  {showThree && <td>{dataC.latestSensors.s11?.value} ({dataC.latestSensors.s11?.pct}%)</td>}
                </tr>
                <tr>
                  <td>T50 LPT Temp (°R)</td>
                  <td>{dataA.latestSensors.s4?.value} ({dataA.latestSensors.s4?.pct}%)</td>
                  <td>{dataB.latestSensors.s4?.value} ({dataB.latestSensors.s4?.pct}%)</td>
                  {showThree && <td>{dataC.latestSensors.s4?.value} ({dataC.latestSensors.s4?.pct}%)</td>}
                </tr>
                <tr>
                  <td>Core Speed Nc (rpm)</td>
                  <td>{dataA.latestSensors.s9?.value}</td>
                  <td>{dataB.latestSensors.s9?.value}</td>
                  {showThree && <td>{dataC.latestSensors.s9?.value}</td>}
                </tr>
                <tr>
                  <td>Priority Recommendation</td>
                  <td>{dataA.maintenanceAction}</td>
                  <td>{dataB.maintenanceAction}</td>
                  {showThree && <td>{dataC.maintenanceAction}</td>}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

