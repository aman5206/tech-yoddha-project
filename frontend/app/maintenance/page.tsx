"use client";
import { useState } from "react";
import { Printer } from "lucide-react";
import { Review, useApp } from "../../lib/store";
import { FleetEngine, getHistory, getSensors, logMaintenance } from "../../lib/api";
import { Async, Empty, Panel, StatusBadge, downloadCsv, useAsync } from "../../lib/ui";

function Why({ e }: { e: FleetEngine }) {
  const [open, setOpen] = useState(false);
  const s = useAsync(() => (open ? getSensors(e.engine_id) : Promise.resolve(null)), [open, e.engine_id]);
  const top = s.data ? Object.values(s.data.latest).sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 3) : [];
  return (
    <details onToggle={(ev) => setOpen((ev.target as HTMLDetailsElement).open)}>
      <summary>Why flagged</summary>
      <p>The model estimates {Math.round(e.predicted_rul)} cycles remaining at cycle {e.cycle}, inside the {e.health_status.toLowerCase()} range of the prototype thresholds.</p>
      {s.data && <p>Largest sensor drifts from baseline: {top.map((v) => `${v.label} ${v.pct >= 0 ? "+" : ""}${v.pct}% (z=${v.z})`).join("; ")}.</p>}
    </details>
  );
}

export default function Maintenance() {
  const { fleet, review, setReview } = useApp();
  const hist = useAsync(getHistory, []);
  const [err, setErr] = useState<string | null>(null);
  const log = (id: number) => logMaintenance(id).then(() => { hist.reload(); fleet.reload(); }).catch((e) => setErr(e.message));
  return (
    <>
      <h1>Maintenance center</h1>
      {err && <div className="error" role="alert">{err}</div>}
      <Async s={fleet}>{(f) => {
        const due = f.engines.filter((e) => e.health_status !== "HEALTHY");
        const report = due.map((e) => ({ engine: `ENG-${e.engine_id}`, priority: e.priority, status: e.health_status, predicted_rul: e.predicted_rul,
          inspect_within_cycles: e.inspect_within_cycles, target_date: e.inspect_by, review: review[e.engine_id] ?? "Pending", last_inspection: e.last_inspection ?? "" }));
        return (
          <Panel title={`Priority ranking (${due.length} engines for human review)`} right={<div className="filters">
            <button className="btn" onClick={() => downloadCsv("aeroguard-maintenance-report.csv", report)}>Download CSV report</button>
            <button className="btn" onClick={() => window.print()}><Printer size={14} aria-hidden /> Print summary</button></div>}>
            <div className="scroll"><table><thead><tr><th>Engine</th><th>Priority</th><th>RUL</th><th>Recommendation</th><th>Inspect within</th><th>Target date</th><th>Review</th><th></th></tr></thead><tbody>
              {due.map((e) => <tr key={e.engine_id}><td>ENG-{e.engine_id}</td><td><StatusBadge s={e.health_status} label={e.priority} /></td><td>{Math.round(e.predicted_rul)}</td>
                <td>{e.maintenance_action}<Why e={e} /></td><td>{e.inspect_within_cycles} cycles</td><td>{e.inspect_by}</td>
                <td><select value={review[e.engine_id] ?? "Pending"} aria-label={`Review status ENG-${e.engine_id}`} onChange={(ev) => setReview(e.engine_id, ev.target.value as Review)}>
                  {["Pending", "Reviewed", "Completed"].map((r) => <option key={r}>{r}</option>)}</select></td>
                <td><button className="btn small" onClick={() => log(e.engine_id)}>Log inspection</button></td></tr>)}</tbody></table></div>
            <p className="empty">Model-informed suggestions for human review. Windows keep a 10-cycle reserve and assume {f.cycles_per_day_assumption} flight cycles per day. Review status is stored in this browser only.</p>
          </Panel>);
      }}</Async>
      <Panel title="Inspection history">
        <Async s={hist}>{(h) => h.length === 0 ? <Empty>No inspections logged yet. Use “Log inspection” in the table above.</Empty> :
          h.map((r) => <div className="row" key={r.id}><span>{r.date}</span><span>ENG-{r.engine_id}: {r.action}</span></div>)}</Async>
      </Panel>
    </>
  );
}
