"use client";
import { useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../../lib/store";
import { getCompare, getEngineHistory, getSensors } from "../../lib/api";
import { Async, C, Empty, Panel, RISK, StatusBadge, TT, useAsync } from "../../lib/ui";

export default function FailurePrediction() {
  const { engine, setEngine, models, activeModel } = useApp();
  const [cycle, setCycle] = useState(9999);
  const cmp = useAsync(() => getCompare(engine, cycle), [engine, cycle]);
  const sens = useAsync(() => getSensors(engine, cycle), [engine, cycle]);
  const hist = useAsync(() => getEngineHistory(engine, activeModel), [engine, activeModel]);
  return (
    <>
      <h1>Failure prediction</h1>
      <div className="filters wrap">
        <label className="inline">Engine <input type="number" min={1} max={100} value={engine} onChange={(e) => { setEngine(Math.min(100, Math.max(1, Number(e.target.value) || 1))); setCycle(9999); }} /></label>
        {cmp.data && <label className="inline slider">Cycle {cmp.data.cycle} of {cmp.data.max_cycle}
          <input type="range" min={1} max={cmp.data.max_cycle} value={cmp.data.cycle} onChange={(e) => setCycle(Number(e.target.value))} aria-label="Cycle" /></label>}
      </div>
      <Async s={cmp}>{(c) => {
        const d = c.models[c.default_model];
        return (
          <>
            <div className="grid2">
              <Panel title="Failure risk classification">
                <div className="risk" style={{ borderColor: C[d.health_status] }}><b>{RISK[d.health_status]}</b><StatusBadge s={d.health_status} /></div>
                <p className="empty">Model-estimated risk from predicted RUL using prototype thresholds (above 100 Low, 50 to 100 Elevated, 20 to 50 High, below 20 Critical). Reference RUL at this cycle: {c.actual_rul}.</p>
              </Panel>
              <Panel title="Model predictions at this cycle">
                <div className="cards3">{Object.entries(c.models).map(([m, v]) => (
                  <div key={m} className="panel kpi"><b>{Math.round(v.predicted_rul)}</b>{m.toUpperCase()}<StatusBadge s={v.health_status} /></div>))}</div>
                <p className="empty">Spread {c.spread[0]} to {c.spread[1]} cycles.</p>
              </Panel>
            </div>
            <div className="grid2">
              <Panel title="Model comparison (NASA test set, true RUL capped at 125)">
                <Async s={models}>{(m) => !m.metrics ? <Empty>No results.json found.</Empty> :
                  <table><thead><tr><th>Model</th><th>MAE</th><th>RMSE</th><th>R²</th><th>NASA score</th><th>ms/sample</th></tr></thead><tbody>
                    {Object.entries(m.metrics).map(([k, v]) => <tr key={k}><td>{k.toUpperCase()}</td><td>{v.test_capped.mae.toFixed(1)}</td><td>{v.test_capped.rmse.toFixed(1)}</td>
                      <td>{v.test_capped.r2.toFixed(2)}</td><td>{Math.round(v.test_capped.nasa_score)}</td><td>{v.inference_ms_per_sample.toFixed(2)}</td></tr>)}</tbody></table>}</Async>
              </Panel>
              <Panel title="Sensor contribution (deviation from baseline)">
                <Async s={sens}>{(s) => {
                  const rows = Object.values(s.latest).map((v) => ({ name: v.label, z: v.z })).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
                  return <><div style={{ height: 250 }}><ResponsiveContainer><BarChart data={rows} layout="vertical" margin={{ left: 90 }}>
                    <XAxis type="number" stroke={C.muted} /><YAxis type="category" dataKey="name" stroke={C.muted} width={150} tick={{ fontSize: 11 }} /><Tooltip {...TT} />
                    <Bar dataKey="z" name="z-score">{rows.map((r) => <Cell key={r.name} fill={r.z >= 0 ? C.WARNING : C.accent} />)}</Bar></BarChart></ResponsiveContainer></div>
                    <p className="empty">Shows which sensors have drifted most (z-score vs early-life baseline). This is a deviation measure, not SHAP; model attributions are not connected yet.</p></>;
                }}</Async>
              </Panel>
            </div>
            <Panel title="Anomaly detection">
              <Async s={sens}>{(s) => <>
                <p>Anomaly score: <b>{Math.round(s.anomaly_score * 100)}%</b> of monitored sensors deviate more than 3 standard deviations from baseline. A deviation is not proof of failure.</p>
                <div className="tiles">{Object.entries(s.latest).map(([id, v]) => <div key={id} className={v.flag ? "tile flag" : "tile"}><b>{v.flag ? "Deviating" : "Normal"}</b><span>{v.label}</span><em>z = {v.z}</em></div>)}</div></>}</Async>
            </Panel>
          </>);
      }}</Async>
      <Panel title="Prediction history">
        <Async s={hist}>{(h) => <div className="scroll short"><table><thead><tr><th>Cycle</th><th>Predicted</th><th>Reference</th><th>Status</th></tr></thead><tbody>
          {[...h.predictions].reverse().map((p) => <tr key={p.cycle}><td>{p.cycle}</td><td>{Math.round(p.predicted_rul)}</td><td>{p.actual_rul}</td><td><StatusBadge s={p.health_status} /></td></tr>)}</tbody></table></div>}</Async>
      </Panel>
    </>
  );
}
