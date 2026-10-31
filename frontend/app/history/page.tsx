"use client";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../../lib/store";
import { getEngineHistory, getSensors } from "../../lib/api";
import { Async, C, Empty, Panel, StatusBadge, TT, useAsync } from "../../lib/ui";

const PALETTE = [C.accent, C.WARNING, C.HEALTHY, "#B48CFF", "#FF7AB6", "#7FD4D4", "#D4B23A", "#9AA7B4", "#E5484D"];

export default function EngineHistory() {
  const { fleet, engine, setEngine, activeModel } = useApp();
  const [q, setQ] = useState(""); const [st, setSt] = useState("ALL"); const [lo, setLo] = useState(0); const [hi, setHi] = useState(1000);
  const [picked, setPicked] = useState<string[]>(["s4", "s9", "s11"]);
  const hist = useAsync(() => getEngineHistory(engine, activeModel), [engine, activeModel]);
  const sens = useAsync(() => getSensors(engine), [engine]);
  return (
    <>
      <h1>Engine history</h1>
      <Panel title="All engines" right={<div className="filters">
        <input placeholder="Engine ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter by engine ID" />
        <select value={st} onChange={(e) => setSt(e.target.value)} aria-label="Filter by status">{["ALL", "HEALTHY", "MONITOR", "WARNING", "CRITICAL"].map((s) => <option key={s}>{s}</option>)}</select>
        <input type="number" value={lo} onChange={(e) => setLo(Number(e.target.value))} aria-label="Minimum cycle" title="Min cycle" />
        <input type="number" value={hi} onChange={(e) => setHi(Number(e.target.value))} aria-label="Maximum cycle" title="Max cycle" /></div>}>
        <Async s={fleet}>{(f) => {
          const rows = f.engines.filter((e) => (!q || String(e.engine_id).includes(q.replace(/\D/g, ""))) && (st === "ALL" || e.health_status === st) && e.cycle >= lo && e.cycle <= hi);
          return <div className="scroll"><table><thead><tr><th>Engine</th><th>Cycles recorded</th><th>Predicted RUL</th><th>Status</th></tr></thead><tbody>
            {rows.length === 0 && <tr><td colSpan={4}><Empty>No engines match these filters.</Empty></td></tr>}
            {rows.map((e) => <tr key={e.engine_id} className={`click ${e.engine_id === engine ? "sel" : ""}`} tabIndex={0}
              onClick={() => setEngine(e.engine_id)} onKeyDown={(k) => k.key === "Enter" && setEngine(e.engine_id)}>
              <td>ENG-{e.engine_id}</td><td>{e.cycle}</td><td>{Math.round(e.predicted_rul)}</td><td><StatusBadge s={e.health_status} /></td></tr>)}</tbody></table></div>;
        }}</Async>
      </Panel>

      <h2>ENG-{engine} details</h2>
      <Async s={hist}>{(h) => {
        const last = h.predictions[h.predictions.length - 1];
        return (
          <>
            <div className="kpis"><div className="panel kpi"><b>{h.max_cycle}</b>Cycles recorded</div>
              <div className="panel kpi"><b>{Math.round(last.predicted_rul)}</b>Latest predicted RUL ({h.model.toUpperCase()})</div>
              <div className="panel kpi"><b>{h.final_rul}</b>Reference RUL at last cycle</div>
              <div className="panel kpi"><StatusBadge s={last.health_status} /></div></div>
            <div className="grid2">
              <Panel title="Historical sensor trends (% change vs baseline)">
                <div className="chips">{Object.entries(h.sensors).map(([id, n]) => <label key={id}><input type="checkbox" checked={picked.includes(id)}
                  onChange={() => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])} />{n}</label>)}</div>
                <Async s={sens}>{(s) => <div style={{ height: 260 }}><ResponsiveContainer><LineChart data={s.rows}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" /><XAxis dataKey="cycle" stroke={C.muted} /><YAxis stroke={C.muted} width={44} /><Tooltip {...TT} />
                  {Object.keys(h.sensors).filter((id) => picked.includes(id)).map((id, i) => <Line key={id} dataKey={id} name={h.sensors[id]} stroke={PALETTE[i % 9]} dot={false} isAnimationActive={false} />)}
                </LineChart></ResponsiveContainer></div>}</Async>
              </Panel>
              <Panel title="Historical predictions">
                <div className="scroll short"><table><thead><tr><th>Cycle</th><th>Predicted</th><th>Reference</th><th>Status</th></tr></thead><tbody>
                  {[...h.predictions].reverse().map((p) => <tr key={p.cycle}><td>{p.cycle}</td><td>{Math.round(p.predicted_rul)}</td><td>{p.actual_rul}</td><td><StatusBadge s={p.health_status} /></td></tr>)}</tbody></table></div>
              </Panel>
            </div>
            <Panel title="Raw sensor readings (latest 15 cycles)">
              <div className="scroll short"><table><thead><tr><th>Cycle</th>{Object.keys(h.sensors).map((id) => <th key={id} title={h.sensors[id]}>{id}</th>)}</tr></thead><tbody>
                {h.readings.slice(-15).reverse().map((r) => <tr key={r.cycle}><td>{r.cycle}</td>{Object.keys(h.sensors).map((id) => <td key={id}>{r[id]}</td>)}</tr>)}</tbody></table></div>
            </Panel>
          </>);
      }}</Async>
    </>
  );
}
