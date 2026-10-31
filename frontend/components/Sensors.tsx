"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SensorData } from "../lib/api";

const COLORS = ["#2457a6", "#c27a0e", "#1f8a5b"];

export default function Sensors({ data, engine, replaying }: { data: SensorData | null; engine: number; replaying: boolean }) {
  if (!data) return <p className="empty">Loading sensor history…</p>;
  const flagged = Object.values(data.latest).filter((s) => s.flag).length;
  return (
    <>
      <p className="empty">ENG-{engine}: {replaying ? "replaying live" : "full recorded history"}. Charts show % change from the engine’s own
        first {data.baseline_cycles} cycles. {flagged} of {Object.keys(data.latest).length} sensors currently deviate from baseline.</p>
      <div className="grid2">
        {Object.entries(data.groups).map(([name, ids]) => (
          <section className="panel" key={name}><h2>{name} (% change)</h2>
            <div style={{ height: 210 }}><ResponsiveContainer>
              <LineChart data={data.rows} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="#d5dce3" strokeDasharray="3 3" /><XAxis dataKey="cycle" /><YAxis width={44} /><Tooltip />
                {ids.map((s, i) => <Line key={s} dataKey={s} name={data.latest[s].label} stroke={COLORS[i % 3]} dot={false} isAnimationActive={false} />)}
              </LineChart></ResponsiveContainer></div>
          </section>))}
        <section className="panel"><h2>Vibration</h2>
          <p className="empty">The NASA C-MAPSS dataset has no vibration channel, so none is shown rather than mislabeling another sensor. Connect a real vibration feed to add this panel.</p>
        </section>
      </div>
      <section className="panel"><h2>Anomaly indicators</h2>
        <div className="scroll"><table><thead><tr><th>Sensor</th><th>Latest</th><th>Change vs baseline</th><th>Deviation (z)</th><th>Indicator</th></tr></thead>
          <tbody>{Object.entries(data.latest).map(([id, s]) => <tr key={id}><td>{s.label}</td><td>{s.value}</td>
            <td>{s.pct}%</td><td>{s.z}</td><td><span className={`badge ${s.flag ? "WARNING" : "HEALTHY"}`}>{s.flag ? "Deviating" : "Normal"}</span></td></tr>)}</tbody></table></div>
        <p className="empty">A deviation means the sensor moved more than 3 standard deviations from its early-life baseline. It is not proof of failure; read it alongside RUL.</p>
      </section>
    </>
  );
}
