"use client";
import React, { useState } from "react";
import { useApp } from "../../lib/store";
import { Panel } from "../../lib/ui";
import { Settings as SettingsIcon, Sliders, Moon, Sun, Cpu, CheckCircle2, User } from "lucide-react";

export default function SettingsPage() {
  const { settings, setSettings, models } = useApp();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="main">
      <div className="ph">
        <div>
          <h1>System Settings & Preferences</h1>
          <p className="empty">
            Configure telemetry model inference, 3D graphics rendering presets, theme mode, and operator workspace.
          </p>
        </div>
      </div>

      <div className="grid2">
        {/* Model & Inference Preferences */}
        <Panel title="Machine Learning Inference Engine">
          <div className="form" style={{ maxWidth: "100%" }}>
            <label>
              <span>Default RUL Predictor Architecture</span>
              <select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              >
                <option value="">Auto (Default: LSTM)</option>
                <option value="lstm">LSTM (Long Short-Term Memory)</option>
                <option value="gru">GRU (Gated Recurrent Unit)</option>
                <option value="xgboost">XGBoost Decision Trees</option>
              </select>
            </label>

            <label>
              <span>Simulation Step Discretization</span>
              <select
                value={settings.step}
                onChange={(e) => setSettings({ ...settings, step: Number(e.target.value) })}
              >
                <option value={1}>1 Cycle (High-Resolution Detailed Playback)</option>
                <option value={5}>5 Cycles (Recommended Balanced)</option>
                <option value={10}>10 Cycles (Fast Telemetry Stream)</option>
                <option value={20}>20 Cycles (Fleet Scrubber Mode)</option>
              </select>
            </label>

            <label>
              <input
                type="checkbox"
                checked={settings.compact}
                onChange={(e) => setSettings({ ...settings, compact: e.target.checked })}
              />
              <span>High-Density Engineering Layout (Compact Tables)</span>
            </label>
          </div>
        </Panel>

        {/* 3D Graphics & Performance */}
        <Panel title="3D Digital Twin Graphics Presets">
          <div className="form" style={{ maxWidth: "100%" }}>
            <label>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => setSettings({ ...settings, reducedMotion: e.target.checked })}
              />
              <span>Reduced Motion (Pause Automatic Spool Rotations)</span>
            </label>

            <div style={{ background: "#142232", padding: "14px", borderRadius: "6px", border: "1px solid #1e2f42" }}>
              <h4 style={{ margin: "0 0 6px", fontSize: "12px", color: "#38bdf8", textTransform: "uppercase" }}>
                Rendering Pipeline
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
                Three.js WebGL 2.0 with local clipping planes enabled for cutaways, PBR metallic shaders, dynamic airflow particle fields, and responsive device pixel ratio (DPR: 1-2).
              </p>
            </div>

            <button className="btn dark" onClick={handleSave} style={{ marginTop: "10px" }}>
              {saved ? <CheckCircle2 size={16} /> : <SettingsIcon size={16} />}
              <span>{saved ? "Preferences Saved to Browser" : "Save Workspace Configuration"}</span>
            </button>
          </div>
        </Panel>
      </div>

      {/* Operator & Team Profile */}
      <Panel title="Lead Operator Profile & Team Attribution">
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "20px", alignItems: "center" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0284c7, #38bdf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 800,
              color: "#070d14",
            }}
          >
            AB
          </div>
          <div>
            <h3 style={{ fontSize: "18px", color: "#f8fafc", margin: "0 0 4px" }}>Aditya Bijore</h3>
            <div style={{ color: "#38bdf8", fontSize: "13px", fontWeight: 600 }}>Team Leader & Aerospace Software Architect</div>
            <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>Team Tech Yodhas — National Aerospace Engineering Innovation</div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
