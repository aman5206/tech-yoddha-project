"use client";
import { useState } from "react";
import { Fleet, Status } from "../lib/api";

export default function Overview({ fleet, onSelect }: { fleet: Fleet | null; onSelect: (id: number) => void }) {
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  if (!fleet) return <p className="empty">Loading fleet…</p>;
  const kpis = [
    ["Engines monitored", fleet.total], ["Healthy", fleet.healthy],
    ["Need attention", fleet.attention], ["Critical", fleet.critical], ["Average predicted RUL", `${fleet.average_rul} cycles`],
  ];
  const rows = fleet.engines.filter((e) => filter === "ALL" || e.health_status === filter);
  return (
    <>
      <div className="kpis">{kpis.map(([l, v]) => <div className="panel kpi" key={l}><b>{v}</b>{l}</div>)}</div>
      <section className="panel">
        <h2>Fleet status at each engine’s last recorded cycle</h2>
        <label className="inline">Show <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          {["ALL", "CRITICAL", "WARNING", "MONITOR", "HEALTHY"].map((s) => <option key={s}>{s}</option>)}</select></label>
        <div className="scroll"><table>
          <thead><tr><th>Engine</th><th>Cycle</th><th>Predicted RUL</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{rows.map((e) => (
            <tr key={e.engine_id} className="click" tabIndex={0} onClick={() => onSelect(e.engine_id)}
                onKeyDown={(k) => k.key === "Enter" && onSelect(e.engine_id)}>
              <td>ENG-{e.engine_id}</td><td>{e.cycle}</td><td>{Math.round(e.predicted_rul)}</td>
              <td><span className={`badge ${e.health_status}`}>{e.health_status}</span></td><td>{e.maintenance_action}</td>
            </tr>))}</tbody>
        </table></div>
        <p className="empty">Select an engine to replay its life cycle by cycle.</p>
      </section>
    </>
  );
}
