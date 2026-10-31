"use client";
import Link from "next/link";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../lib/store";
import { getAlerts } from "../lib/api";
import { Async, C, Empty, Kpi, Panel, StatusBadge, TT, useAsync } from "../lib/ui";

export default function Dashboard() {
  const { fleet, setEngine } = useApp();
  const alerts = useAsync(getAlerts, []);
  return (
    <Async s={fleet}>{(f) => {
      const pie = [["Healthy", f.healthy, C.HEALTHY], ["Warning", f.attention, C.WARNING], ["Critical", f.critical, C.CRITICAL]] as const;
      const bins = Array.from({ length: 6 }, (_, i) => ({ range: i === 5 ? "125+" : `${i * 25}–${i * 25 + 24}`, count: 0 }));
      f.engines.forEach((e) => { bins[Math.min(5, Math.floor(e.predicted_rul / 25))].count++; });
      return (
        <>
          <h1>Fleet dashboard</h1>
          <div className="kpis">
            <Kpi label="Total engines" value={f.total} /><Kpi label="Healthy engines" value={f.healthy} />
            <Kpi label="Warning engines (monitor or warning)" value={f.attention} /><Kpi label="Critical engines" value={f.critical} />
            <Kpi label="Average predicted RUL" value={`${f.average_rul} cycles`} />
          </div>
          <div className="grid2">
            <Panel title="Fleet health">
              <div style={{ height: 240 }}><ResponsiveContainer><PieChart>
                <Pie data={pie.map(([name, value]) => ({ name, value }))} dataKey="value" innerRadius={60} outerRadius={95} stroke="#121C26">
                  {pie.map(([n, , c]) => <Cell key={n} fill={c} />)}</Pie><Tooltip {...TT} /></PieChart></ResponsiveContainer></div>
              <p className="legend">{pie.map(([n, v, c]) => <span key={n}><i style={{ background: c }} />{n} {v}</span>)}</p>
            </Panel>
            <Panel title="Fleet RUL distribution (cycles)">
              <div style={{ height: 240 }}><ResponsiveContainer><BarChart data={bins}>
                <XAxis dataKey="range" stroke={C.muted} /><YAxis stroke={C.muted} width={32} allowDecimals={false} /><Tooltip {...TT} />
                <Bar dataKey="count" name="Engines" fill={C.accent} /></BarChart></ResponsiveContainer></div>
            </Panel>
          </div>
          <div className="grid2">
            <Panel title="Lowest predicted RUL">
              <table><thead><tr><th>Engine</th><th>RUL</th><th>Status</th></tr></thead><tbody>
                {f.engines.slice(0, 8).map((e) => <tr key={e.engine_id}>
                  <td><Link href="/simulation" onClick={() => setEngine(e.engine_id)}>ENG-{e.engine_id}</Link></td>
                  <td>{Math.round(e.predicted_rul)}</td><td><StatusBadge s={e.health_status} /></td></tr>)}</tbody></table>
            </Panel>
            <Panel title="Recent alerts">
              <Async s={alerts}>{(a) => a.length === 0 ? <Empty>No alerts yet. Start a simulation to see alerts appear.</Empty> :
                [...a].reverse().slice(0, 6).map((x) => <div className="row" key={x.alert_id}><StatusBadge s={x.severity} /><span>{x.engine_id}: {x.description}</span></div>)}</Async>
              <Link href="/alerts">Open alerts center</Link>
            </Panel>
          </div>
        </>);
    }}</Async>
  );
}
