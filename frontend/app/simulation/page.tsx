"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useApp } from "../../lib/store";
import { C, Empty, Panel, StatusBadge } from "../../lib/ui";

const Engine3D = dynamic(() => import("../../components/Engine3D"), { ssr: false, loading: () => <div className="skeleton tall" /> });

export default function Simulation() {
  const { engine, setEngine, sim, models, activeModel, settings, setSettings, fleet } = useApp();
  const [cut, setCut] = useState(false);
  const { last } = sim;
  const maxCycle = last?.max_cycle ?? fleet.data?.engines.find((e) => e.engine_id === engine)?.cycle ?? 200;
  const nf = sim.sensors?.latest.s8?.value ?? 2388;
  const speed = sim.running && !settings.reducedMotion ? 3 * (nf / 2388) : 0;
  const hot = last && (last.health_status === "WARNING" || last.health_status === "CRITICAL");
  return (
    <>
      <h1>Engine simulation</h1>
      {hot && <div className={`banner ${last.health_status}`} role="alert">{last.health_status} alert: ENG-{engine} is estimated to have about {Math.round(last.predicted_rul)} cycles left. {last.maintenance_action}.</div>}
      {sim.error && <div className="error" role="alert">{sim.error}</div>}
      <div className="sim">
        <Panel title="Digital twin" right={<div className="filters">
          <label><input type="checkbox" checked={cut} onChange={(e) => setCut(e.target.checked)} /> Cutaway</label>
          <label><input type="checkbox" checked={!settings.reducedMotion} onChange={(e) => setSettings({ ...settings, reducedMotion: !e.target.checked })} /> Rotation</label></div>}>
          <Engine3D speed={speed} cutaway={cut} color={last ? C[last.health_status] : "#E58A2B"}
            label={`3D turbofan. Status ${last?.health_status ?? "not started"}, ${speed ? "rotating at playback fan speed" : "stationary"}.`} />
          <p className="empty">Visualization of the modeled engine state, not a validated physical replica. Rotation follows the replayed fan-speed sensor; the combustor glows in the current status colour. Drag to orbit, hover for parts.</p>
        </Panel>
        <div className="stack">
          <Panel title="Playback">
            <div className="filters wrap">
              <label>Engine <input type="number" min={1} max={100} value={engine} disabled={sim.running} onChange={(e) => setEngine(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} /></label>
              <label>Model <select value={settings.model} disabled={sim.running} onChange={(e) => setSettings({ ...settings, model: e.target.value })}>
                <option value="">Best ({models.data?.default_model?.toUpperCase() ?? "…"})</option>
                {models.data?.available_models.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></label>
              <label>Predict every <select value={settings.step} disabled={sim.running} onChange={(e) => setSettings({ ...settings, step: Number(e.target.value) })}>
                {[1, 5, 10, 20].map((s) => <option key={s} value={s}>{s} cycles</option>)}</select></label>
            </div>
            <div className="filters">
              {sim.running ? <button className="btn dark" onClick={sim.pause}>Pause</button>
                : <button className="btn dark" disabled={sim.finished || !models.data} onClick={sim.start}>{sim.points.length ? "Resume" : "Start"}</button>}
              <button className="btn" onClick={sim.reset}>Reset</button>
            </div>
            <label className="slider">Cycle {last?.cycle ?? 0} of {maxCycle}
              <input type="range" min={1} max={maxCycle} value={last?.cycle ?? 1} onChange={(e) => sim.seek(Number(e.target.value))} aria-label="Cycle slider" /></label>
          </Panel>
          <Panel title={`AI prediction (${activeModel.toUpperCase() || "…"})`}>
            {last ? <div className="readout"><div className="rul">{Math.round(last.predicted_rul)}<small>cycles left</small></div>
              <StatusBadge s={last.health_status} /><p className="empty">Reference RUL: {last.actual_rul}. {last.maintenance_action}.</p></div>
              : <Empty>Press Start or move the slider to get a prediction.</Empty>}
          </Panel>
          <Panel title="Live sensors">
            {!sim.sensors ? <Empty>Sensor tiles appear during playback.</Empty> :
              <div className="tiles">{Object.entries(sim.sensors.latest).map(([id, s]) => (
                <div key={id} className={s.flag ? "tile flag" : "tile"}><b>{s.value}</b><span>{s.label}</span>
                  <em>{s.pct >= 0 ? "+" : ""}{s.pct}% {s.flag ? "· deviating" : ""}</em></div>))}</div>}
          </Panel>
        </div>
      </div>
    </>
  );
}
