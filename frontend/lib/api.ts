export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export type Status = "HEALTHY" | "MONITOR" | "WARNING" | "CRITICAL";

export interface SimPoint { engine_id: string; cycle: number; max_cycle: number; predicted_rul: number; actual_rul: number; health_status: Status; maintenance_action: string; model: string; padded: boolean }
export interface Alert { alert_id: number; engine_id: string; severity: Status; description: string; status: string; created_at: string }
export interface MetricBlock { mae: number; rmse: number; r2: number; nasa_score: number }
export interface ModelsStatus { version: string; dataset: string; default_model: string; available_models: string[]; seq_len: number; metrics: Record<string, { test_capped: MetricBlock; validation: MetricBlock; inference_ms_per_sample: number }> | null }
export interface FleetEngine { engine_id: number; cycle: number; predicted_rul: number; health_status: Status; maintenance_action: string; inspect_within_cycles: number; inspect_by: string; priority: string; last_inspection: string | null }
export interface Fleet { total: number; healthy: number; attention: number; critical: number; average_rul: number; cycles_per_day_assumption: number; engines: FleetEngine[] }
export interface SensorInfo { label: string; value: number; pct: number; z: number; flag: boolean }
export interface SensorData { groups: Record<string, string[]>; rows: Record<string, number>[]; latest: Record<string, SensorInfo>; anomaly_score: number; baseline_cycles: number }
export interface HistoryRec { id: number; engine_id: number; action: string; notes: string; date: string }
export interface HistoryPoint { cycle: number; predicted_rul: number; actual_rul: number; health_status: Status }
export interface EngineHistory { engine_id: number; max_cycle: number; final_rul: number; model: string; predictions: HistoryPoint[]; readings: Record<string, number>[]; sensors: Record<string, string> }
export interface Compare { engine_id: number; cycle: number; max_cycle: number; actual_rul: number; models: Record<string, { predicted_rul: number; health_status: Status }>; spread: [number, number]; default_model: string }
export interface Heatmap { sensors: Record<string, string>; rows: Record<string, number>[] }

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try { r = await fetch(`${API}${path}`, { cache: "no-store", ...init }); }
  catch { throw new Error(`Cannot reach the API at ${API}. Start it with: uvicorn backend.main:app --port 8000`); }
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail ?? `Request failed (${r.status})`);
  return r.json();
}
const post = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const getModels = () => req<ModelsStatus>("/models/status");
export const getFleet = () => req<Fleet>("/fleet");
export const getAlerts = () => req<Alert[]>("/alerts");
export const ackAlert = (id: number) => req<Alert>(`/alerts/${id}/ack`, { method: "POST" });
export const getSensors = (e: number, upto = 100000) => req<SensorData>(`/sensors/${e}?upto=${upto}`);
export const getEngineHistory = (e: number, model = "", step = 5) => req<EngineHistory>(`/engine/${e}/history?step=${step}&model=${model}`);
export const getCompare = (e: number, c: number) => req<Compare>(`/compare/${e}/${c}`);
export const getHeatmap = () => req<Heatmap>("/heatmap");
export const getHistory = () => req<HistoryRec[]>("/maintenance/history");
export const logMaintenance = (e: number) => req<HistoryRec>(`/maintenance/${e}/log`, post({ action: "Inspection completed" }));
export const simulate = (e: number, c: number, model?: string) => req<SimPoint>(`/simulation/${e}/cycle/${c}${model ? `?model=${model}` : ""}`);
export const ask = (question: string, engine_id?: number, cycle?: number) => req<{ answer: string; sources: string[] }>("/assistant", post({ question, engine_id, cycle }));
