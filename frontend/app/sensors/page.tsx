"use client";
import React, { useState } from "react";
import { useApp } from "../../lib/store";
import {
  SENSOR_DEFINITIONS,
  SENSOR_GROUPS,
  generateEngineCycleData,
  getEngineHistoryData,
} from "../../lib/api";
import Engine3D from "../../components/Engine3D";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceArea,
} from "recharts";
import { TT, C } from "../../lib/ui";
import { Gauge, Activity, AlertCircle, Info, Sparkles } from "lucide-react";

export default function SensorIntelligencePage() {
  const { engine, setEngine } = useApp();
  const [activeGroup, setActiveGroup] = useState<string>("Temperature");
  const [selectedSensor, setSelectedSensor] = useState<string>("s3");
  const [cycle, setCycle] = useState(130);

  const history = getEngineHistoryData(engine, 5);
  const telemetry = generateEngineCycleData(engine, cycle);
  const activeDef = SENSOR_DEFINITIONS[selectedSensor];

  const groupSensors = (SENSOR_GROUPS as any)[activeGroup] || ["s2", "s3", "s4"];

  // Prepare line chart data for selected sensor group
  const chartData = history.readings.map((r) => ({
    cycle: r.cycle,
    ...r,
  }));

  return (
    <div className="main">
      <div className="ph">
        <div>
          <h1>Sensor Intelligence Center</h1>
          <p className="empty">
            Multi-channel telemetry analysis for 21 NASA C-MAPSS stations, baseline drift, and z-score anomaly detection.
          </p>
        </div>
        <div className="filters">
          <label className="inline">
            Engine:
            <select value={engine} onChange={(e) => setEngine(Number(e.target.value))}>
              {Array.from({ length: 50 }, (_, i) => i + 1).map((id) => (
                <option key={id} value={id}>ENG-{id}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Sensor Group Tabs */}
      <div className="tabs">
        {Object.keys(SENSOR_GROUPS).map((grp) => (
          <button
            key={grp}
            className={activeGroup === grp ? "on" : ""}
            onClick={() => setActiveGroup(grp)}
          >
            {grp}
          </button>
        ))}
      </div>

      {/* Sensor Metric Cards */}
      <div className="tiles">
        {groupSensors.map((sKey: string) => {
          const def = SENSOR_DEFINITIONS[sKey];
          const info = telemetry.latestSensors[sKey];
          const isSelected = selectedSensor === sKey;
          if (!def) return null;
          return (
            <div
              key={sKey}
              className={`tile ${info?.flag ? "flag" : ""} ${isSelected ? "sel" : ""}`}
              style={{ cursor: "pointer", border: isSelected ? "2px solid #38bdf8" : undefined }}
              onClick={() => setSelectedSensor(sKey)}
            >
              <span>{def.label}</span>
              <b>{info ? `${info.value} ${def.unit}` : `${def.baseline} ${def.unit}`}</b>
              {info && (
                <em style={{ color: info.pct > 0 ? "#f87171" : "#38bdf8" }}>
                  {info.pct > 0 ? `+${info.pct}%` : `${info.pct}%`} (z={info.z})
                </em>
              )}
            </div>
          );
        })}
      </div>

      {/* Telemetry Chart and 3D Station Sync */}
      <div className="grid2">
        <section className="panel">
          <div className="ph">
            <h2>{activeDef?.label || "Sensor Time-Series"}</h2>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Station: {activeDef?.station} | Component: {activeDef?.component}
            </span>
          </div>
          <div style={{ height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="cycle" stroke="#64748b" />
                <YAxis stroke="#64748b" domain={["auto", "auto"]} />
                <Tooltip {...TT} />
                <Legend />
                {groupSensors.map((sKey: string, idx: number) => {
                  const colors = ["#38bdf8", "#f59e0b", "#ef4444", "#a855f7"];
                  return (
                    <Line
                      key={sKey}
                      type="monotone"
                      dataKey={sKey}
                      name={SENSOR_DEFINITIONS[sKey]?.label.split("(")[0] || sKey}
                      stroke={colors[idx % colors.length]}
                      dot={false}
                      strokeWidth={selectedSensor === sKey ? 3 : 1.5}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 3D Physical Station Locator */}
        <section className="panel">
          <div className="ph">
            <h2>3D Engine Station Mapping</h2>
            <span style={{ color: "#38bdf8", fontSize: "12px" }}>
              Active Sensor Beacon: {selectedSensor.toUpperCase()}
            </span>
          </div>
          <Engine3D
            height={320}
            initialMode="sensor"
            selectedSensor={selectedSensor}
            onSelectSensor={setSelectedSensor}
            showToolbar={false}
          />
        </section>
      </div>

      {/* Sensor Contribution & Correlation Table */}
      <section className="panel">
        <h2>Station Correlation & RUL Feature Importance</h2>
        <div className="scroll short">
          <table>
            <thead>
              <tr>
                <th>Channel</th>
                <th>Physical Station</th>
                <th>Subsystem</th>
                <th>Nominal Baseline</th>
                <th>Current Value</th>
                <th>Drift %</th>
                <th>z-Score</th>
                <th>Predictive Weight</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(telemetry.latestSensors).map(([key, s]) => (
                <tr
                  key={key}
                  className={`click ${selectedSensor === key ? "sel" : ""}`}
                  onClick={() => setSelectedSensor(key)}
                >
                  <td><b>{key.toUpperCase()}</b> ({s.label})</td>
                  <td>{s.station}</td>
                  <td>{s.component}</td>
                  <td>{s.baseline} {s.unit}</td>
                  <td style={{ color: s.flag ? "#ef4444" : "#e2e8f0" }}>{s.value} {s.unit}</td>
                  <td style={{ color: s.pct > 0 ? "#f87171" : "#38bdf8" }}>
                    {s.pct > 0 ? `+${s.pct}%` : `${s.pct}%`}
                  </td>
                  <td><b>{s.z}</b></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          height: "6px",
                          width: `${Math.min(100, Math.abs(s.z) * 22)}px`,
                          background: s.flag ? "#ef4444" : "#38bdf8",
                          borderRadius: "3px",
                        }}
                      />
                      <span>{(Math.abs(s.z) * 0.18).toFixed(2)}</span>
                    </div>
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

