"use client";
import { ReactNode, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, OctagonAlert } from "lucide-react";
import { Status } from "./api";

export const C = { HEALTHY: "#3DBE8B", MONITOR: "#D4B23A", WARNING: "#E58A2B", CRITICAL: "#E5484D", accent: "#5AB0FF", grid: "#223140", muted: "#8A9BAB" };
export const TT = { contentStyle: { background: "#182533", border: "1px solid #223140", color: "#E6EDF3" } };
export const RISK: Record<Status, string> = { HEALTHY: "Low", MONITOR: "Elevated", WARNING: "High", CRITICAL: "Critical" };
const ICON = { HEALTHY: CheckCircle2, MONITOR: Eye, WARNING: AlertTriangle, CRITICAL: OctagonAlert };

export function StatusBadge({ s, label }: { s: Status; label?: string }) {
  const I = ICON[s];
  return <span className={`badge ${s}`}><I size={13} aria-hidden />{label ?? s}</span>;
}
export const Panel = ({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) => (
  <section className="panel">{(title || right) && <div className="ph"><h2>{title}</h2>{right}</div>}{children}</section>
);
export const Kpi = ({ label, value }: { label: string; value: ReactNode }) => <div className="panel kpi"><b>{value}</b>{label}</div>;
export const Empty = ({ children }: { children: ReactNode }) => <p className="empty">{children}</p>;

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let on = true;
    setLoading(true); setError(null);
    fn().then((d) => on && setData(d)).catch((e) => on && setError(e.message)).finally(() => on && setLoading(false));
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}
export type AsyncState<T> = ReturnType<typeof useAsync<T>>;

export function Async<T>({ s, children }: { s: { data: T | null; error: string | null; reload: () => void }; children: (d: T) => ReactNode }) {
  if (s.error) return <div className="error" role="alert">{s.error} <button className="btn small" onClick={s.reload}>Retry</button></div>;
  if (!s.data) return <div className="skeleton" aria-busy="true" aria-label="Loading" />;
  return <>{children(s.data)}</>;
}

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name; a.click();
}
