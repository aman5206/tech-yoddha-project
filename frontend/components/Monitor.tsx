"use client";
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ModelsStatus } from "../lib/api";
import { Sim } from "../hooks/useSimulation";

export default function Monitor({ sim, engine, setEngine, models }:
  { sim: Sim; engine: number; setEngine: (n: number) => void; models: ModelsStatus | null }) {
  const { last, points } = sim;
  const hot = last && (last.health_status === "WARNING" || last.health_status === "CRITICAL");
  const readings = sim.sensors ? Object.entries(sim.sensors.latest) : [];
  return (
    <>
      <section className="panel controls">
        <label className="inline">Engine <input type="number" min={1} max={100} value={engine} disabled={sim.running}
          onChange={(e) => setEngine(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} /></label>
        <label className="inline">Model <select value={sim.model} disabled={sim.running} onChange={(e) => sim.setModel(e.target.value)}>
          {models?.available_models.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></label>
        <label className="inline">Predict every <select value={sim.step} disabled={sim.running}
          onChange={(e) => sim.setStep(Number(e.target.value))}>{[1, 5, 10, 20].map((s) => <option key={s} value={s}>{s} cycles</option>)}</select></label>
        {sim.running
          ? <button className="btn dark" onClick={sim.pause}>Pause</button>
          : <button className="btn dark" disabled={!models || sim.finished} onClick={sim.start}>{points.length ? "Resume" : "Start simulation"}</button>}
        <button className="btn" onClick={sim.reset}>Reset</button>
      </section>
      {sim.error && <div className="error" role="alert">{sim.error}</div>}
      {hot && <div className={`banner ${last.health_status}`} role="alert">
        {last.health_status} alert: ENG-{engine} has about {Math.round(last.predicted_rul)} cycles left. {last.maintenance_action}.</div>}

      <section className="readout" aria-live="polite">
        <div>
          <div className="rul">{last ? Math.round(last.predicted_rul) : "–"}<small>cycles left</small></div>
          <div className="action">{last ? <span className={`badge ${last.health_status}`}>{last.health_status}</span> : <span className="empty">Start the simulation to begin monitoring.</span>}</div>
        </div>
        <div className="facts">
          <div><b>ENG-{engine}</b>Engine ID</div>
          <div><b>{last ? `${last.cycle} / ${last.max_cycle}` : "–"}</b>Operating cycle</div>
          <div><b>{last?.actual_rul ?? "–"}</b>Actual RUL</div>
        </div>
      </section>

      <section className="panel"><h2>Degradation graph: predicted vs actual RUL</h2>
        <div style={{ height: 300 }}><ResponsiveContainer>
          <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <ReferenceArea y1={0} y2={20} fill="#c23b2e" fillOpacity={0.12} />
            <ReferenceArea y1={20} y2={50} fill="#c27a0e" fillOpacity={0.12} />
            <CartesianGrid stroke="#d5dce3" strokeDasharray="3 3" />
            <XAxis dataKey="cycle" type="number" domain={[0, last?.max_cycle ?? "auto"]} /><YAxis width={40} /><Tooltip />
            <Line dataKey="actual_rul" name="Actual" stroke="#5b6b7a" strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <Line dataKey="predicted_rul" name="Predicted" stroke="#2457a6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart></ResponsiveContainer></div>
      </section>

      <div className="grid2">
        <section className="panel"><h2>Latest sensor readings</h2>
          {readings.length === 0 ? <p className="empty">Readings appear as cycles are processed.</p> :
            <div className="readings">{readings.map(([id, s]) => <div key={id} className={s.flag ? "flag" : ""}><b>{s.value}</b>{s.label}</div>)}</div>}
        </section>
        <section className="panel"><h2>Prediction history</h2>
          {points.length === 0 ? <p className="empty">Each update adds a row here.</p> :
            <div className="scroll short"><table><thead><tr><th>Cycle</th><th>Predicted</th><th>Actual</th><th>Status</th></tr></thead>
              <tbody>{[...points].reverse().map((p) => <tr key={p.cycle}><td>{p.cycle}</td><td>{Math.round(p.predicted_rul)}</td>
                <td>{p.actual_rul}</td><td><span className={`badge ${p.health_status}`}>{p.health_status}</span></td></tr>)}</tbody></table></div>}
        </section>
      </div>

      <section className="panel"><h2>Alerts</h2>
        {sim.alerts.length === 0 ? <p className="empty">An alert is raised when predicted RUL enters the warning range (below 50 cycles).</p> :
          [...sim.alerts].reverse().slice(0, 6).map((a) => <div className="alert" key={a.alert_id}>
            <span className={`badge ${a.severity}`}>{a.severity}</span><span>{a.engine_id}: {a.description}</span></div>)}
      </section>
    </>
  );
}
