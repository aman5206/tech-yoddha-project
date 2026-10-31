"use client";
import { Fleet, HistoryRec } from "../lib/api";

export default function Maintenance({ fleet, history, onLog }: { fleet: Fleet | null; history: HistoryRec[]; onLog: (id: number) => void }) {
  if (!fleet) return <p className="empty">Loading schedule…</p>;
  const due = fleet.engines.filter((e) => e.health_status !== "HEALTHY");
  return (
    <>
      <section className="panel"><h2>Maintenance schedule ({due.length} engines)</h2>
        <div className="scroll"><table>
          <thead><tr><th>Engine</th><th>Priority</th><th>Predicted RUL</th><th>Inspect within</th><th>Target date</th><th>Last inspection</th><th></th></tr></thead>
          <tbody>{due.map((e) => <tr key={e.engine_id}>
            <td>ENG-{e.engine_id}</td><td><span className={`badge ${e.health_status}`}>{e.priority}</span></td>
            <td>{Math.round(e.predicted_rul)}</td><td>{e.inspect_within_cycles} cycles</td><td>{e.inspect_by}</td>
            <td>{e.last_inspection ?? "None logged"}</td>
            <td><button className="btn small" onClick={() => onLog(e.engine_id)}>Log inspection</button></td></tr>)}</tbody>
        </table></div>
        <p className="empty">Windows keep a 10-cycle reserve before predicted failure and assume {fleet.cycles_per_day_assumption} flight cycles per day.
          These are prototype planning aids, not certified maintenance intervals.</p>
      </section>
      <section className="panel"><h2>Maintenance history</h2>
        {history.length === 0 ? <p className="empty">No inspections logged yet. Use “Log inspection” above.</p> :
          history.map((h) => <div className="alert" key={h.id}><span>{h.date}</span><span>ENG-{h.engine_id}: {h.action}</span></div>)}
      </section>
    </>
  );
}
