"use client";
import React from "react";
import { getModelsStatusData } from "../../lib/api";
import { Info, ShieldCheck, Cpu, Code2, AlertTriangle, Award } from "lucide-react";

export default function ModelTransparencyPage() {
  const modelsStatus = getModelsStatusData();

  return (
    <div className="main">
      <div className="ph">
        <div>
          <h1>Model Transparency & Architecture</h1>
          <p className="empty">
            Full documentation of deep learning models, training hyperparameters, NASA C-MAPSS dataset, and validation metrics.
          </p>
        </div>
        <div className="demo">
          AEROSPACE AI GOVERNANCE STANDARD
        </div>
      </div>

      {/* Model Cards */}
      <div className="cards3">
        <div className="panel" style={{ borderTop: "3px solid #38bdf8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>LSTM Architecture</h3>
            <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 600 }}>PRIMARY MODEL</span>
          </div>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0" }}>
            2-layer Long Short-Term Memory network with sequence length 30, hidden dimension 64, dropout 0.2, and linear regression head.
          </p>
          <div className="row">
            <span>Test MAE (Capped 125)</span>
            <b>{modelsStatus.metrics?.lstm.test_capped.mae} cycles</b>
          </div>
          <div className="row">
            <span>Test RMSE</span>
            <b>{modelsStatus.metrics?.lstm.test_capped.rmse} cycles</b>
          </div>
          <div className="row">
            <span>NASA Penalty Score</span>
            <b>{modelsStatus.metrics?.lstm.test_capped.nasa_score}</b>
          </div>
          <div className="row">
            <span>Inference Latency</span>
            <b>{modelsStatus.metrics?.lstm.inference_ms_per_sample} ms</b>
          </div>
        </div>

        <div className="panel" style={{ borderTop: "3px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>GRU Architecture</h3>
            <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>ENSEMBLE</span>
          </div>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0" }}>
            Gated Recurrent Unit network optimizing temporal dependencies with lower computational overhead and faster inference.
          </p>
          <div className="row">
            <span>Test MAE (Capped 125)</span>
            <b>{modelsStatus.metrics?.gru.test_capped.mae} cycles</b>
          </div>
          <div className="row">
            <span>Test RMSE</span>
            <b>{modelsStatus.metrics?.gru.test_capped.rmse} cycles</b>
          </div>
          <div className="row">
            <span>NASA Penalty Score</span>
            <b>{modelsStatus.metrics?.gru.test_capped.nasa_score}</b>
          </div>
          <div className="row">
            <span>Inference Latency</span>
            <b>{modelsStatus.metrics?.gru.inference_ms_per_sample} ms</b>
          </div>
        </div>

        <div className="panel" style={{ borderTop: "3px solid #10b981" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>XGBoost Regressor</h3>
            <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 600 }}>BENCHMARK</span>
          </div>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0" }}>
            Gradient boosted decision tree ensemble utilizing rolling statistical window aggregations (mean, std, min, max).
          </p>
          <div className="row">
            <span>Test MAE (Capped 125)</span>
            <b>{modelsStatus.metrics?.xgboost.test_capped.mae} cycles</b>
          </div>
          <div className="row">
            <span>Test RMSE</span>
            <b>{modelsStatus.metrics?.xgboost.test_capped.rmse} cycles</b>
          </div>
          <div className="row">
            <span>NASA Penalty Score</span>
            <b>{modelsStatus.metrics?.xgboost.test_capped.nasa_score}</b>
          </div>
          <div className="row">
            <span>Inference Latency</span>
            <b>{modelsStatus.metrics?.xgboost.inference_ms_per_sample} ms</b>
          </div>
        </div>
      </div>

      {/* Dataset Details */}
      <section className="panel">
        <h2>Training Dataset: NASA C-MAPSS FD001</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "12px" }}>
          <div>
            <p style={{ color: "#cbd5e1", lineHeight: 1.6, fontSize: "14px" }}>
              The <b>Commercial Modular Aero-Propulsion System Simulation (C-MAPSS)</b> sub-dataset FD001 simulates a 90,000 lb thrust class turbofan engine operating under Sea-Level Standard atmospheric flight conditions.
            </p>
            <ul style={{ color: "#94a3b8", fontSize: "13px", paddingLeft: "20px", lineHeight: 1.8 }}>
              <li>Fault Mode: High-Pressure Compressor (HPC) aerodynamic degradation</li>
              <li>Operating Conditions: 1 (Sea level, Mach 0.0, standard day)</li>
              <li>Training Engine Trajectories: 100 units until failure</li>
              <li>Test Engine Trajectories: 100 units truncated prior to failure</li>
              <li>Sensor Features: 21 channels (14 non-constant informative channels)</li>
            </ul>
          </div>

          <div style={{ background: "#1e293b", padding: "16px", borderRadius: "6px" }}>
            <h3 style={{ color: "#f8fafc", margin: "0 0 10px" }}>NASA Scoring Function Formulation</h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6 }}>
              Evaluated with the asymmetric aerospace loss function penalizing late predictions (overestimating RUL, risking catastrophic failure) more severely than early predictions:
            </p>
            <div style={{ background: "#0f172a", padding: "10px", borderRadius: "4px", fontFamily: "monospace", fontSize: "13px", color: "#38bdf8", margin: "10px 0" }}>
              S = Σ [ exp( -d / 13 ) - 1 ] for d &lt; 0 (early)
              <br />
              S = Σ [ exp( d / 10 ) - 1 ] for d &gt;= 0 (late)
            </div>
            <small style={{ color: "#64748b" }}>Where d = Predicted RUL - Actual Ground Truth RUL</small>
          </div>
        </div>
      </section>

      {/* Engineering Disclaimer */}
      <div className="panel" style={{ borderLeft: "4px solid #f59e0b", background: "rgba(30, 41, 59, 0.5)" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <b style={{ color: "#f8fafc", display: "block", marginBottom: "4px" }}>Human-in-the-Loop Engineering Protocol</b>
            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", lineHeight: 1.5 }}>
              AeroGuard AI is an engineering decision-support tool designed for aircraft fleet reliability engineers and maintenance planners.
              Model inferences must be verified via physical non-destructive testing (NDT), borescope video inspection, and certified aviation safety guidelines prior to issuing airworthiness directives.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

