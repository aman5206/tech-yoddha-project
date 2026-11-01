"use client";
import React, { useState } from "react";
import { useApp } from "../../lib/store";
import { generateEngineCycleData } from "../../lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { TT, C } from "../../lib/ui";
import { Sliders, AlertTriangle, Play, RotateCcw, Sparkles } from "lucide-react";

export default function ScenarioPage() {
  const { engine } = useApp();
  const [thermalBias, setThermalBias] = useState(1.5); // % temperature stress
  const [pressureDropRate, setPressureDropRate] = useState(1.2); // HPC clearance degradation multiplier
  const [flightIntensity, setFlightIntensity] = useState(3.5); // flights per day

  const baseData = generateEngineCycleData(engine, 120);

  // Calculate hypothetical accelerated/decelerated degradation trajectory
  const baselineRul = baseData.predictedRul;
  const stressFactor = (thermalBias * 0.4 + pressureDropRate * 0.6);
  const hypotheticalRul = Math.max(5, Math.round(baselineRul / stressFactor));
  const rulDelta = hypotheticalRul - baselineRul;

  // Trajectory curve comparison
  const trajectoryPoints = [];
  const maxCycles = 60;
  for (let c = 0; c <= maxCycles; c += 5) {
    trajectoryPoints.push({
      futureCycles: c,
      Baseline: Math.max(0, baselineRul - c),
      "Hypothetical What-If": Math.max(0, hypotheticalRul - Math.round(c * stressFactor)),
    });
  }

  return (
    <div className="main">
      <div className="ph">
        <div>
          <h1>Scenario / What-If Simulation Lab</h1>
          <p className="empty">
            Explore hypothetical changes to operating temperature, pressure leakage, and flight intensity on Remaining Useful Life.
          </p>
        </div>
        <div className="demo">
          HYPOTHETICAL STRESS SIMULATION (EXPERIMENTAL)
        </div>
      </div>

      <div className="grid2">
        {/* Scenario Controls */}
        <section className="panel">
          <h2>Environmental & Operating Parameters</h2>
          <div className="form" style={{ maxWidth: "100%", gap: "20px" }}>
            <label className="slider">
              <span>HPC Outlet Temperature (T30) Thermal Stress Bias: <b>+{thermalBias}%</b></span>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={thermalBias}
                onChange={(e) => setThermalBias(Number(e.target.value))}
              />
              <small>Simulates high ambient desert operations or bleed air duct fouling.</small>
            </label>

            <label className="slider">
              <span>HPC Seal Clearance Degradation Multiplier: <b>{pressureDropRate}x</b></span>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.1"
                value={pressureDropRate}
                onChange={(e) => setPressureDropRate(Number(e.target.value))}
              />
              <small>Simulates accelerated tip clearance growth and labyrinth seal spallation.</small>
            </label>

            <label className="slider">
              <span>Flight Fleet Utilization: <b>{flightIntensity} cycles/day</b></span>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.5"
                value={flightIntensity}
                onChange={(e) => setFlightIntensity(Number(e.target.value))}
              />
              <small>Converts cycle projections into calendar maintenance calendar deadlines.</small>
            </label>

            <button
              className="btn"
              onClick={() => {
                setThermalBias(1.0);
                setPressureDropRate(1.0);
                setFlightIntensity(3.0);
              }}
            >
              <RotateCcw size={14} />
              <span>Reset to Standard Operating Atmosphere</span>
            </button>
          </div>
        </section>

        {/* Hypothetical Impact Summary */}
        <section className="panel">
          <h2>Hypothetical Life Impact (ENG-{engine})</h2>
          <div className="kpis">
            <div className="kpi">
              <span>Nominal RUL</span>
              <b>{baselineRul} cycles</b>
            </div>
            <div className="kpi">
              <span>Simulated RUL</span>
              <b style={{ color: rulDelta < 0 ? "#ef4444" : "#22c55e" }}>
                {hypotheticalRul} cycles
              </b>
            </div>
            <div className="kpi">
              <span>Calendar Impact</span>
              <b style={{ color: rulDelta < 0 ? "#ef4444" : "#38bdf8" }}>
                {rulDelta > 0 ? `+${(rulDelta / flightIntensity).toFixed(0)}` : `${(rulDelta / flightIntensity).toFixed(0)}`} days
              </b>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <div className="drawer-ai-card" style={{ background: "rgba(15, 23, 42, 0.6)" }}>
              <div className="drawer-ai-title">
                <Sparkles size={16} color="#38bdf8" />
                <b>What-If Engineering Synthesis</b>
              </div>
              <p>
                Under the simulated stress parameters ({thermalBias}% T30 drift, {pressureDropRate}x HPC seal clearance rate),
                hot-section turbine creep is projected to accelerate by{" "}
                <b>{((stressFactor - 1) * 100).toFixed(0)}%</b>.
                Maintenance inspection threshold of 25 cycles would be reached{" "}
                <b>{Math.abs(Math.round(rulDelta / flightIntensity))} days earlier</b> than nominal fleet schedule.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Trajectory Curve */}
      <section className="panel">
        <h2>Simulated Degradation Trajectory Comparison</h2>
        <div style={{ height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={trajectoryPoints}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="futureCycles" stroke="#64748b" label={{ value: "Operating Cycles Ahead", position: "insideBottom", offset: -5 }} />
              <YAxis stroke="#64748b" label={{ value: "Remaining Useful Life (Cycles)", angle: -90, position: "insideLeft" }} />
              <Tooltip {...TT} />
              <Legend />
              <Line type="monotone" dataKey="Baseline" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Hypothetical What-If" stroke="#ef4444" strokeWidth={2.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

