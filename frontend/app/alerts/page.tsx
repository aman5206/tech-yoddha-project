"use client";
import { useState } from "react";
import { Alert, ackAlert, getAlerts, getSensors } from "../../lib/api";
import { useApp } from "../../lib/store";
import { Async, Empty, Panel, StatusBadge, useAsync } from "../../lib/ui";

const TABS = ["Critical", "Warning", "Informational", "History"] as const;

function Detail({ a }: { a: Alert }) {
  const id = parseInt(a.engine_id.replace(/\D/g, ""), 10);
  const s = useAsync(() => getSensors(id), [id]);
  return (
    <Panel title={`Alert #${a.alert_id} details`}>
      <p><StatusBadge s={a.severity} /> {a.engine_id}, raised {new Date(a.created_at).toLocaleString()}</p>
      <p>Reason: {a.description}. Rule: predicted RUL entered the {a.severity === "CRITICAL" ? "critical (below 20 cycles)" : "warning (20 to 50 cycles)"} range of the prototype thresholds.</p>
      <Async s={s}>{(d) => <p>Largest sensor drifts: {Object.values(d.latest).sort((x, y) => Math.abs(y.z) - Math.abs(x.z)).slice(0, 3).map((v) => `${v.label} (z=${v.z})`).join("; ")}.</p>}</Async>
    </Panel>
  );
}

export default function Alerts() {
  const { models, fleet } = useApp();
  const alerts = useAsync(getAlerts, []);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Critical");
  const [eng, setEng] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [sel, setSel] = useState<Alert | null>(null);
  const info = [`Model bundle ${models.data?.version ?? "…"} loaded (${models.data?.available_models.join(", ") ?? "…"})`,
    `Fleet snapshot computed for ${fleet.data?.total ?? "…"} engines`, "Demo mode: data replayed from NASA C-MAPSS, not live telemetry"];
  const ack = (id: number) => ackAlert(id).then(() => alerts.reload());
  return (
    <>
      <h1>Alerts center</h1>
      <div className="tabs" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}</div>
      <div className="filters wrap"><input placeholder="Engine ID" value={eng} onChange={(e) => setEng(e.target.value)} aria-label="Filter by engine" />
        <label className="inline">From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="inline">To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>
      {tab === "Informational" ? <Panel title="System events">{info.map((i) => <div className="row" key={i}>{i}</div>)}</Panel> :
        <Panel title={tab === "History" ? "Acknowledged alerts" : `${tab} alerts`}>
          <Async s={alerts}>{(all) => {
            const rows = all.filter((a) => (tab === "History" ? a.status !== "open" : a.status === "open" && a.severity === tab.toUpperCase())
              && (!eng || a.engine_id.includes(eng.replace(/\D/g, ""))) && (!from || a.created_at.slice(0, 10) >= from) && (!to || a.created_at.slice(0, 10) <= to));
            return rows.length === 0 ? <Empty>No alerts here. Alerts are created when a simulation enters the warning range.</Empty> :
              rows.map((a) => <div className="row" key={a.alert_id}><StatusBadge s={a.severity} /><button className="link" onClick={() => setSel(a)}>{a.engine_id}: {a.description}</button>
                {a.status === "open" ? <button className="btn small" onClick={() => ack(a.alert_id)}>Acknowledge</button> : <span className="empty">Reviewed</span>}</div>);
          }}</Async>
        </Panel>}
      {sel && <Detail a={sel} />}
    </>
  );
}
