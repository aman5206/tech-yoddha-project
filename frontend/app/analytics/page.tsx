"use client";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../../lib/store";
import { getEngineHistory, getHeatmap, getSensors } from "../../lib/api";
import { Async, C, Panel, TT, useAsync } from "../../lib/ui";

const PAL = [C.accent, C.WARNING, C.HEALTHY, "#B48CFF"];
const cell = (v: number) => { const a = Math.min(1, Math.abs(v) / 15) * 0.85; return v >= 0 ? `rgba(229,138,43,${a})` : `rgba(90,176,255,${a})`; };

export default function Analytics() {
  const { engine, models, activeModel } = useApp();
  const [group, setGroup] = useState("Temperature");
  const [ids, setIds] = useState("24, 31, 56");
  const list = ids.split(",").map((s) => parseInt(s, 10)).filter((n) => n >= 1 && n <= 100).slice(0, 4);
  const sens = useAsync(() => getSensors(engine), [engine]);
  const heat = useAsync(getHeatmap, []);
  const cmp = useAsync(() => Promise.all(list.map((i) => getEngineHistory(i, activeModel))), [list.join(), activeModel]);
  return (
    <>
      <h1>Analytics</h1>
      <Panel title={`Sensor line charts and degradation trends: ENG-${engine}`} right={
        <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Sensor group">{Object.keys(sens.data?.groups ?? { Temperature: [] }).map((g) => <option key={g}>{g}</option>)}</select>}>
        <Async s={sens}>{(s) => <div style={{ height: 260 }}><ResponsiveContainer><LineChart data={s.rows}>
          <CartesianGrid stroke={C.grid} strokeDasharray="3 3" /><XAxis dataKey="cycle" stroke={C.muted} /><YAxis stroke={C.muted} width={44} unit="%" /><Tooltip {...TT} />
          {(s.groups[group] ?? []).map((id, i) => <Line key={id} dataKey={id} name={s.latest[id].label} stroke={PAL[i % 4]} dot={false} isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div>}</Async>
      </Panel>
      <Panel title="Sensor heatmap: change vs baseline at each engine's last cycle (blue lower, orange higher)">
        <Async s={heat}>{(h) => <div className="scroll"><table className="heat"><thead><tr><th>Engine</th>{Object.entries(h.sensors).map(([id, n]) => <th key={id} title={n}>{id}</th>)}</tr></thead><tbody>
          {h.rows.map((r) => <tr key={r.engine_id}><td>ENG-{r.engine_id}</td>{Object.keys(h.sensors).map((id) => <td key={id} style={{ background: cell(r[id]) }} title={`${h.sensors[id]}: ${r[id]}%`}>{r[id]}</td>)}</tr>)}</tbody></table></div>}</Async>
        <p className="empty">Colour is paired with the printed value, so the table reads without colour.</p>
      </Panel>
      <Panel title="Engine comparison (up to 4 engines)" right={<input value={ids} onChange={(e) => setIds(e.target.value)} aria-label="Engine IDs, comma separated" />}>
        <Async s={cmp}>{(hs) => {
          const m = new Map<number, Record<string, number>>();
          hs.forEach((h) => h.predictions.forEach((p) => m.set(p.cycle, { ...(m.get(p.cycle) ?? { cycle: p.cycle }), [`e${h.engine_id}`]: p.predicted_rul })));
          const rows = [...m.values()].sort((a, b) => a.cycle - b.cycle);
          const pts = hs.flatMap((h) => h.predictions.map((p) => ({ x: p.actual_rul, y: p.predicted_rul })));
          return (
            <div className="grid2">
              <div><h3>Predicted RUL across cycles</h3><div style={{ height: 260 }}><ResponsiveContainer><LineChart data={rows}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" /><XAxis dataKey="cycle" stroke={C.muted} /><YAxis stroke={C.muted} width={40} /><Tooltip {...TT} />
                {hs.map((h, i) => <Line key={h.engine_id} dataKey={`e${h.engine_id}`} name={`ENG-${h.engine_id}`} stroke={PAL[i]} dot={false} connectNulls isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div></div>
              <div><h3>Actual vs predicted ({activeModel.toUpperCase()})</h3><div style={{ height: 260 }}><ResponsiveContainer><ScatterChart>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" /><XAxis type="number" dataKey="x" name="Actual" stroke={C.muted} /><YAxis type="number" dataKey="y" name="Predicted" stroke={C.muted} width={40} /><Tooltip {...TT} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 350, y: 350 }]} stroke={C.muted} strokeDasharray="4 4" /><Scatter data={pts} fill={C.accent} /></ScatterChart></ResponsiveContainer></div>
                <p className="empty">Points on the dashed line are perfect predictions. Predictions are capped near 125 by design.</p></div>
            </div>);
        }}</Async>
      </Panel>
      <Panel title="Model performance metrics">
        <Async s={models}>{(m) => <>
          <table><thead><tr><th>Model</th><th>MAE</th><th>RMSE</th><th>NASA score</th></tr></thead><tbody>
            {Object.entries(m.metrics ?? {}).map(([k, v]) => <tr key={k}><td>{k.toUpperCase()}</td><td>{v.test_capped.mae.toFixed(1)}</td><td>{v.test_capped.rmse.toFixed(1)}</td><td>{Math.round(v.test_capped.nasa_score)}</td></tr>)}</tbody></table>
          <p className="empty">Showing one experiment: model bundle {m.version}. A multi-run performance history needs experiment tracking, which is not set up yet.</p></>}</Async>
      </Panel>
    </>
  );
}
