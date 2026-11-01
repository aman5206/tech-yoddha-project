"use client";
import React, { useState, useEffect } from "react";
import Engine3D from "../../components/Engine3D";
import { useApp } from "../../lib/store";
import {
  COMPONENT_METADATA,
  SENSOR_DEFINITIONS,
  generateEngineCycleData,
  logMaintenance,
} from "../../lib/api";
import { TURBOFAN_COMPONENT_REGISTRY, resolveComponentId } from "../../components/engine/ComponentRegistry";
import { VisualizationMode } from "../../components/engine/EngineMaterials";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Flame,
  Info,
  Maximize2,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";

export default function TwinStudioPage() {
  const { engine, setEngine } = useApp();
  const [cycle, setCycle] = useState(115);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [selectedComp, setSelectedComp] = useState<string | null>("HPC_CORE");
  const [selectedSensor, setSelectedSensor] = useState<string | null>("s3");
  const [mode, setMode] = useState<VisualizationMode>("standard");
  const [actionLogged, setActionLogged] = useState(false);

  // Compute live engine telemetry at the current cycle
  const telemetry = generateEngineCycleData(engine, cycle);

  // Lookup in technical registry or fallback metadata
  const resolvedKey = selectedComp ? (resolveComponentId(selectedComp) || selectedComp) : null;
  const techSpec = resolvedKey ? TURBOFAN_COMPONENT_REGISTRY[resolvedKey] : null;
  const fallbackMeta = selectedComp ? (COMPONENT_METADATA as any)[selectedComp] : null;

  // Animation cycle playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCycle((prev) => {
        if (prev >= telemetry.maxCycle) {
          setIsPlaying(false);
          return telemetry.maxCycle;
        }
        return Math.min(telemetry.maxCycle, prev + Math.round(1 * playSpeed));
      });
    }, 300);
    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, telemetry.maxCycle]);

  // Compute health scores for all components
  const componentHealthMap: Record<string, number> = {
    FAN_BLADES: Math.round(100 - telemetry.progress * 42),
    SPINNER_CONE: 98,
    FAN_CASING: 96,
    BYPASS_DUCT: 94,
    LPC_BOOSTER: Math.round(100 - telemetry.progress * 58),
    HPC_CORE: Math.round(100 - telemetry.progress * 85),
    HPC_CASING: Math.round(100 - telemetry.progress * 62),
    COMBUSTOR_ANNULAR: Math.round(100 - telemetry.progress * 76),
    FUEL_INJECTORS: Math.round(100 - telemetry.progress * 68),
    HPT_STAGE_1: Math.round(100 - telemetry.progress * 88),
    HPT_STAGE_2: Math.round(100 - telemetry.progress * 80),
    LPT_TURBINE: Math.round(100 - telemetry.progress * 64),
    SHAFT_N1: Math.round(100 - telemetry.progress * 32),
    SHAFT_N2: Math.round(100 - telemetry.progress * 48),
    BEARING_COMPARTMENTS: Math.round(100 - telemetry.progress * 52),
    EXHAUST_NOZZLE: Math.round(100 - telemetry.progress * 40),
    EXHAUST_CONE: Math.round(100 - telemetry.progress * 38),
    ACCESSORY_GEARBOX: Math.round(100 - telemetry.progress * 45),
    // Fallback legacy keys
    Fan: Math.round(100 - telemetry.progress * 42),
    LPC: Math.round(100 - telemetry.progress * 58),
    HPC: Math.round(100 - telemetry.progress * 85),
    Combustor: Math.round(100 - telemetry.progress * 76),
    HPT: Math.round(100 - telemetry.progress * 88),
    LPT: Math.round(100 - telemetry.progress * 64),
    Shaft: Math.round(100 - telemetry.progress * 32),
    Nacelle: 96,
    Exhaust: Math.round(100 - telemetry.progress * 40),
    Gearbox: Math.round(100 - telemetry.progress * 45),
  };

  const handleLogInspection = async () => {
    if (!selectedComp) return;
    const name = techSpec?.name || fallbackMeta?.name || selectedComp;
    await logMaintenance(
      engine,
      `Engineering Inspection — ${name}`,
      `Borescope inspection at cycle ${cycle}. Degradation: ${(telemetry.progress * 100).toFixed(1)}%. RUL estimate: ${telemetry.predictedRul} cycles.`
    );
    setActionLogged(true);
    setTimeout(() => setActionLogged(false), 4000);
  };

  const activeHealthScore = resolvedKey ? (componentHealthMap[resolvedKey] ?? 85) : 85;

  return (
    <div className="studio-layout">
      {/* Studio Header Bar */}
      <div className="studio-header">
        <div className="studio-header-left">
          <div className="studio-title-badge">
            <span className="pulse-dot" />
            <b>CFM-56 HIGH-BYPASS TURBOFAN DIGITAL TWIN</b>
          </div>
          <div className="studio-engine-picker">
            <label>Monitored Unit:</label>
            <select
              value={engine}
              onChange={(e) => {
                const id = Number(e.target.value);
                setEngine(id);
                setCycle(Math.floor(generateEngineCycleData(id, 1).maxCycle * 0.65));
              }}
            >
              {Array.from({ length: 50 }, (_, i) => i + 1).map((id) => (
                <option key={id} value={id}>
                  CFM-56 Turbofan [ENG-{id}]
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="studio-header-stats">
          <div className="stat-capsule">
            <span>Health Index</span>
            <b style={{ color: telemetry.healthScore > 75 ? "#22c55e" : telemetry.healthScore > 50 ? "#f59e0b" : "#ef4444" }}>
              {telemetry.healthScore} / 100
            </b>
          </div>
          <div className="stat-capsule">
            <span>Predicted RUL</span>
            <b style={{ color: "#38bdf8" }}>{telemetry.predictedRul} cycles</b>
          </div>
          <div className="stat-capsule">
            <span>Status</span>
            <span className={`badge ${telemetry.healthStatus}`}>{telemetry.healthStatus}</span>
          </div>
        </div>
      </div>

      {/* Main Studio Viewport Grid */}
      <div className="studio-body">
        {/* Left Interactive 3D Viewport */}
        <div className="studio-canvas-container">
          <Engine3D
            height="100%"
            speed={isPlaying ? 1.4 : 0.8}
            initialMode={mode}
            selectedComponent={selectedComp}
            onSelectComponent={setSelectedComp}
            componentHealth={componentHealthMap}
            latestSensors={telemetry.latestSensors}
            selectedSensor={selectedSensor}
            onSelectSensor={setSelectedSensor}
            showToolbar={true}
          />
        </div>

        {/* Right Component & Sensor Intelligence Drawer */}
        <div className="studio-inspection-drawer">
          {techSpec ? (
            <div className="drawer-content">
              <div className="drawer-header">
                <div>
                  <span className="drawer-subsystem">{techSpec.subsystem}</span>
                  <h3>{techSpec.name}</h3>
                  <small className="drawer-id">{techSpec.code} ({techSpec.station})</small>
                </div>
                <div
                  className="drawer-score-circle"
                  style={{
                    borderColor: activeHealthScore > 75 ? "#22c55e" : "#f59e0b",
                  }}
                >
                  <span>{activeHealthScore}</span>
                  <small>Score</small>
                </div>
              </div>

              <p className="drawer-desc">{techSpec.description}</p>

              {/* Operating Parameters */}
              <div className="drawer-section">
                <h4>Aerospace Station Specifications</h4>
                <div className="param-grid">
                  <div>
                    <span>Material Alloy</span>
                    <b style={{ fontSize: "11px" }}>{techSpec.material}</b>
                  </div>
                  <div>
                    <span>Nominal Temp</span>
                    <b>{techSpec.nominalTempRange}</b>
                  </div>
                  <div>
                    <span>Pressure Range</span>
                    <b>{techSpec.nominalPressureRange}</b>
                  </div>
                  {techSpec.ratedSpeedRPM && (
                    <div>
                      <span>Rated Speed</span>
                      <b>{techSpec.ratedSpeedRPM}</b>
                    </div>
                  )}
                  <div>
                    <span>Primary Failure Mode</span>
                    <b style={{ color: "#f59e0b", fontSize: "11px" }}>{techSpec.primaryFailureMode}</b>
                  </div>
                  <div>
                    <span>Airworthiness State</span>
                    <b style={{ color: activeHealthScore < 50 ? "#ef4444" : "#22c55e" }}>
                      {activeHealthScore < 50 ? "Inspection Overdue" : "Certified Airworthy"}
                    </b>
                  </div>
                </div>
              </div>

              {/* Related Sensors */}
              <div className="drawer-section">
                <h4>Station Instrumentation Telemetry</h4>
                <div className="sensor-tag-cloud">
                  {techSpec.sensors.map((s: string) => {
                    const key = s.split(" ")[0];
                    const info = telemetry.latestSensors[key];
                    return (
                      <div
                        key={s}
                        className={`sensor-mini-card ${info?.flag ? "flagged" : ""}`}
                        onClick={() => setSelectedSensor(key)}
                      >
                        <div className="sensor-mini-top">
                          <span>{s}</span>
                          {info && <b>{info.value} {info.unit}</b>}
                        </div>
                        {info && (
                          <div className="sensor-mini-bar">
                            <span style={{ color: info.pct > 0 ? "#f87171" : "#38bdf8" }}>
                              {info.pct > 0 ? `+${info.pct}%` : `${info.pct}%`} (z={info.z})
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explainable AI Insight */}
              <div className="drawer-ai-card">
                <div className="drawer-ai-title">
                  <Sparkles size={16} color="#38bdf8" />
                  <b>AI Degradation Evidence</b>
                </div>
                <p>
                  At operating cycle {cycle}, the {techSpec.name} displays an accumulated degradation ratio of{" "}
                  <b>{(telemetry.progress * 100).toFixed(1)}%</b>.
                  {telemetry.anomalyScore > 0.4
                    ? ` Elevated sensor drift detected (anomaly index ${telemetry.anomalyScore}). Gas path seal leakage accelerates hot-section turbine stress.`
                    : ` Component operates within nominal aerodynamic and thermal tolerances.`}
                </p>
              </div>

              {/* Maintenance Recommendation */}
              <div className="drawer-action-box">
                <div className="drawer-action-rec">
                  <Wrench size={16} />
                  <span>{telemetry.maintenanceAction}</span>
                </div>
                <button
                  className="btn dark studio-btn"
                  onClick={handleLogInspection}
                  disabled={actionLogged}
                >
                  {actionLogged ? <CheckCircle2 size={16} /> : <Wrench size={16} />}
                  <span>{actionLogged ? "Borescope Inspection Logged to Record" : "Log Borescope Video Inspection"}</span>
                </button>
              </div>
            </div>
          ) : fallbackMeta ? (
            <div className="drawer-content">
              <div className="drawer-header">
                <div>
                  <span className="drawer-subsystem">{fallbackMeta.subsystem}</span>
                  <h3>{fallbackMeta.name}</h3>
                  <small className="drawer-id">{fallbackMeta.id}</small>
                </div>
              </div>
              <p className="drawer-desc">{fallbackMeta.description}</p>
            </div>
          ) : (
            <div className="drawer-empty">
              <Info size={32} color="#64748b" />
              <h4>Select any engine component</h4>
              <p>Click on the Fan Blades, LPC Booster, 9-Stage HPC, Combustor, HPT Single Crystal, or Shafts in 3D to inspect telemetry and failure risks.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Historical Simulation Timeline */}
      <div className="studio-timeline-bar">
        <div className="timeline-playback-controls">
          <button
            className="timeline-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause Timeline" : "Play History"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            className="timeline-btn"
            onClick={() => {
              setIsPlaying(false);
              setCycle(1);
            }}
            title="Reset to Cycle 1"
          >
            <RotateCcw size={15} />
          </button>
          <div className="speed-pills">
            {[0.5, 1, 2, 5].map((spd) => (
              <button
                key={spd}
                className={`speed-pill ${playSpeed === spd ? "active" : ""}`}
                onClick={() => setPlaySpeed(spd)}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Cycle Scrubber Slider */}
        <div className="timeline-scrubber-group">
          <div className="timeline-info">
            <span>Operating History:</span>
            <b>
              Cycle {cycle} of {telemetry.maxCycle}
            </b>
            <small>({((cycle / telemetry.maxCycle) * 100).toFixed(0)}% recorded life)</small>
          </div>
          <input
            type="range"
            min={1}
            max={telemetry.maxCycle}
            value={cycle}
            onChange={(e) => {
              setIsPlaying(false);
              setCycle(Number(e.target.value));
            }}
            className="timeline-slider"
          />
        </div>

        <div className="timeline-rul-badge">
          <Activity size={14} />
          <span>Estimated RUL: {telemetry.predictedRul} Cycles</span>
        </div>
      </div>
    </div>
  );
}
