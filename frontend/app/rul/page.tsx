"use client";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../../lib/store";
import { getEngineHistory } from "../../lib/api";
import { Async, C, Panel, StatusBadge, TT, useAsync } from "../../lib/ui";

export default function RulMonitoring() {
  const { engine, setEngine, models, activeModel } = useApp();
  const names = models.data?.available_models ?? [];
  const all = useAsync(() => Promise.all(names.map((m) => getEngineHistory(engine, m))), [engine, names.join(",")]);
  return (
    <>
      <h1>RUL monitoring</h1>
      <label className="inline">Engine <input type="number" min={1} max={100} value={engine} onChange={(e) => setEngine(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} /></label>
      <Async s={all}>{(hs) => {
        if (!hs.length) return <p className="empty">Models are still loading.</p>;
        const main = hs.find((h) => h.model === activeModel) ?? hs[0];
        const data = main.predictions.map((p, i) => {
          const v = hs.map((h) => h.predictions[i].predicted_rul);
          return { cycle: p.cycle, actual: p.actual_rul, predicted: p.predicted_rul, range: [Math.min(...v), Math.max(...v)] };
        });
        const last = main.predictions[main.predictions.length - 1];
        return (
          <>
            <div className="kpis"><div className="panel kpi"><b>{Math.round(last.predicted_rul)}</b>Remaining useful life (cycles)</div>
              <div className="panel kpi"><StatusBadge s={last.health_status} /></div>
              <div className="panel kpi"><b>{last.actual_rul}</b>Reference RUL</div>
              <div className="panel kpi"><b>{Math.round(Math.abs(last.predicted_rul - last.actual_rul))}</b>Absolute error (cycles)</div></div>
            <Panel title={`Predicted vs actual RUL (${main.model.toUpperCase()})`}>
              <div style={{ height: 340 }}><ResponsiveContainer><ComposedChart data={data}>
                <ReferenceArea y1={0} y2={20} fill={C.CRITICAL} fillOpacity={0.15} /><ReferenceArea y1={20} y2={50} fill={C.WARNING} fillOpacity={0.15} />
                <ReferenceArea y1={50} y2={100} fill={C.MONITOR} fillOpacity={0.08} />
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" /><XAxis dataKey="cycle" stroke={C.muted} /><YAxis stroke={C.muted} width={40} /><Tooltip {...TT} />
                <Area dataKey="range" name="Model spread" stroke="none" fill={C.accent} fillOpacity={0.18} isAnimationActive={false} />
                <Line dataKey="actual" name="Actual" stroke={C.muted} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                <Line dataKey="predicted" name="Predicted" stroke={C.accent} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </ComposedChart></ResponsiveContainer></div>
              <p className="legend"><span><i style={{ background: C.CRITICAL }} />Critical (below 20)</span><span><i style={{ background: C.WARNING }} />Warning (20 to 50)</span><span><i style={{ background: C.MONITOR }} />Monitor (50 to 100)</span></p>
              <p className="empty">Uncertainty: no statistical confidence interval is available yet. The shaded band is the range across LSTM, GRU and XGBoost (model disagreement). Thresholds are prototype values.</p>
            </Panel>
          </>);
      }}</Async>
    </>
  );
}
