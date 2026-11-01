import {
  Alert,
  Compare,
  EngineHistory,
  Fleet,
  Heatmap,
  HistoryRec,
  ModelsStatus,
  SensorData,
  SimPoint,
  Status,
  generateEngineCycleData,
  getEngineHistoryData,
  getFleetAlerts,
  getFleetData,
  getModelsStatusData,
  SENSOR_GROUPS,
  SENSOR_DEFINITIONS,
  classifyRul,
} from "./dataService";

export * from "./dataService";

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

let isBackendAvailable: boolean | null = null;
let lastCheckTime = 0;

// In-memory maintenance log for simulation
const LOCAL_MAINTENANCE_HISTORY: HistoryRec[] = [
  { id: 101, engine_id: 24, action: "Borescope Inspection — HPC stage 4-6", notes: "Minor coating spallation observed. Within airworthiness limits.", date: "2026-10-28", technician: "Tech Lead: A. Bijore", status: "Completed" },
  { id: 102, engine_id: 34, action: "HPT Nozzle Guide Vane Thermal Inspection", notes: "Trailing edge erosion detected. Scheduled for replacement in 45 cycles.", date: "2026-10-25", technician: "M. Fernandes", status: "Completed" },
  { id: 103, engine_id: 12, action: "Lubrication Scavenge Filter Flush & Oil Spectrometry", notes: "Iron and nickel particle counts nominal.", date: "2026-10-20", technician: "R. Sharma", status: "Completed" },
  { id: 104, engine_id: 88, action: "Fan Blade Ultrasonic Non-Destructive Testing", notes: "No micro-cracking found on 24 titanium wide-chord blades.", date: "2026-10-18", technician: "Tech Lead: A. Bijore", status: "Completed" },
];

let LOCAL_ALERTS: Alert[] = getFleetAlerts();

/**
 * Checks if the backend is reachable with a short timeout
 */
async function checkBackend(): Promise<boolean> {
  const now = Date.now();
  if (isBackendAvailable !== null && now - lastCheckTime < 15000) {
    return isBackendAvailable;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const r = await fetch(`${API}/models/status`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    isBackendAvailable = r.ok;
  } catch {
    isBackendAvailable = false;
  }
  
  lastCheckTime = now;
  return isBackendAvailable;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);
  try {
    const r = await fetch(`${API}${path}`, {
      cache: "no-store",
      signal: controller.signal,
      ...init,
    });
    clearTimeout(timeoutId);
    if (!r.ok) {
      throw new Error(`Request failed with status ${r.status}`);
    }
    return await r.json();
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function getModels(): Promise<ModelsStatus> {
  if (await checkBackend()) {
    try {
      return await req<ModelsStatus>("/models/status");
    } catch {
      // Fallback
    }
  }
  return getModelsStatusData();
}

export async function getFleet(): Promise<Fleet> {
  if (await checkBackend()) {
    try {
      const res = await req<Fleet>("/fleet");
      return { ...res, source: "LIVE_API" };
    } catch {
      // Fallback
    }
  }
  return getFleetData();
}

export async function getAlerts(): Promise<Alert[]> {
  if (await checkBackend()) {
    try {
      return await req<Alert[]>("/alerts");
    } catch {
      // Fallback
    }
  }
  return LOCAL_ALERTS;
}

export async function ackAlert(id: number): Promise<Alert> {
  if (await checkBackend()) {
    try {
      return await req<Alert>(`/alerts/${id}/ack`, { method: "POST" });
    } catch {
      // Fallback
    }
  }
  const idx = LOCAL_ALERTS.findIndex((a) => a.alert_id === id);
  if (idx !== -1) {
    LOCAL_ALERTS[idx] = { ...LOCAL_ALERTS[idx], status: "acknowledged" };
    return LOCAL_ALERTS[idx];
  }
  throw new Error("Alert not found");
}

export async function getSensors(e: number, upto = 100000): Promise<SensorData> {
  if (await checkBackend()) {
    try {
      return await req<SensorData>(`/sensors/${e}?upto=${upto}`);
    } catch {
      // Fallback
    }
  }
  
  const d = generateEngineCycleData(e, upto);
  const rows: Record<string, number>[] = [];
  
  // Return last 30 cycles for sensor chart
  const startC = Math.max(1, d.cycle - 30);
  for (let c = startC; c <= d.cycle; c++) {
    const cd = generateEngineCycleData(e, c);
    rows.push(cd.sensorRow);
  }
  
  return {
    groups: SENSOR_GROUPS,
    rows,
    latest: d.latestSensors,
    anomaly_score: d.anomalyScore,
    baseline_cycles: 30,
  };
}

export async function getEngineHistory(e: number, model = "", step = 5): Promise<EngineHistory> {
  if (await checkBackend()) {
    try {
      return await req<EngineHistory>(`/engine/${e}/history?step=${step}&model=${model}`);
    } catch {
      // Fallback
    }
  }
  return getEngineHistoryData(e, step);
}

export async function getCompare(e: number, c: number): Promise<Compare> {
  if (await checkBackend()) {
    try {
      return await req<Compare>(`/compare/${e}/${c}`);
    } catch {
      // Fallback
    }
  }
  
  const d = generateEngineCycleData(e, c);
  const lstm = classifyRul(d.lstmRul);
  const gru = classifyRul(d.gruRul);
  const xgb = classifyRul(d.xgbRul);
  
  const vals = [d.lstmRul, d.gruRul, d.xgbRul];
  
  return {
    engine_id: e,
    cycle: d.cycle,
    max_cycle: d.maxCycle,
    actual_rul: d.actualRul,
    models: {
      lstm: { predicted_rul: d.lstmRul, health_status: lstm.status, confidence: 0.94 },
      gru: { predicted_rul: d.gruRul, health_status: gru.status, confidence: 0.91 },
      xgboost: { predicted_rul: d.xgbRul, health_status: xgb.status, confidence: 0.86 },
    },
    spread: [Math.min(...vals), Math.max(...vals)],
    default_model: "lstm",
  };
}

export async function getHeatmap(): Promise<Heatmap> {
  if (await checkBackend()) {
    try {
      return await req<Heatmap>("/heatmap");
    } catch {
      // Fallback
    }
  }
  
  const rows: Record<string, number>[] = [];
  for (let eid = 1; eid <= 50; eid++) {
    const d = generateEngineCycleData(eid, 120);
    const row: Record<string, number> = { engine_id: eid };
    Object.entries(d.latestSensors).forEach(([k, v]) => {
      row[k] = v.pct;
    });
    rows.push(row);
  }
  
  const sensorsMap: Record<string, string> = {};
  Object.entries(SENSOR_DEFINITIONS).forEach(([k, v]) => {
    sensorsMap[k] = v.label;
  });
  
  return {
    sensors: sensorsMap,
    rows,
  };
}

export async function getHistory(): Promise<HistoryRec[]> {
  if (await checkBackend()) {
    try {
      return await req<HistoryRec[]>("/maintenance/history");
    } catch {
      // Fallback
    }
  }
  return LOCAL_MAINTENANCE_HISTORY;
}

export async function logMaintenance(e: number, action = "Inspection completed", notes = ""): Promise<HistoryRec> {
  if (await checkBackend()) {
    try {
      return await req<HistoryRec>(`/maintenance/${e}/log`, post({ action, notes }));
    } catch {
      // Fallback
    }
  }
  
  const rec: HistoryRec = {
    id: LOCAL_MAINTENANCE_HISTORY.length + 101,
    engine_id: e,
    action,
    notes: notes || "Routine borescope inspection and sensor calibration verified.",
    date: new Date().toISOString().slice(0, 10),
    technician: "Tech Yodhas Lead: Aditya Bijore",
    status: "Completed",
  };
  LOCAL_MAINTENANCE_HISTORY.unshift(rec);
  return rec;
}

export async function simulate(e: number, c: number, model?: string): Promise<SimPoint> {
  if (await checkBackend()) {
    try {
      return await req<SimPoint>(`/simulation/${e}/cycle/${c}${model ? `?model=${model}` : ""}`);
    } catch {
      // Fallback
    }
  }
  
  const d = generateEngineCycleData(e, c);
  let pred = d.predictedRul;
  if (model === "gru") pred = d.gruRul;
  if (model === "xgboost") pred = d.xgbRul;
  
  const { status, action } = classifyRul(pred);
  
  return {
    engine_id: `ENG-${e}`,
    cycle: d.cycle,
    max_cycle: d.maxCycle,
    predicted_rul: pred,
    actual_rul: d.actualRul,
    health_status: status,
    maintenance_action: action,
    model: model || "lstm",
    padded: c < 30,
    confidence: Number((0.95 - (c / d.maxCycle) * 0.12).toFixed(2)),
  };
}

export async function ask(question: string, engine_id?: number, cycle?: number): Promise<{ answer: string; sources: string[] }> {
  if (await checkBackend()) {
    try {
      return await req<{ answer: string; sources: string[] }>("/assistant", post({ question, engine_id, cycle }));
    } catch {
      // Fallback
    }
  }
  
  const q = question.toLowerCase();
  const eid = engine_id ?? 24;
  const c = cycle ?? 85;
  const d = generateEngineCycleData(eid, c);
  const sources: string[] = ["NASA C-MAPSS FD001 Telemetry", "LSTM Degradation Model", "Station Analysis"];
  
  let answer = "";
  
  if (q.includes("why") || q.includes("risk") || q.includes("anomal") || q.includes("degrad")) {
    answer = `Engine ENG-${eid} at cycle ${c} exhibits an elevated anomaly score of ${d.anomalyScore}. Primary contributing factor: HPC outlet temperature (T30) is drifting +${d.latestSensors.s3?.pct}% above nominal baseline, accompanied by a -${Math.abs(d.latestSensors.s7?.pct)}% drop in HPC static pressure (Ps30). This pattern indicates aerodynamic seal wear and blade clearance degradation in the high-pressure core stages. Model estimates ${Math.round(d.predictedRul)} cycles of Remaining Useful Life.`;
  } else if (q.includes("hpt") || q.includes("turbine") || q.includes("hot section")) {
    answer = `High-Pressure Turbine (HPT) analysis for ENG-${eid}: Coolant bleed (W31) is currently at ${d.latestSensors.s20?.value} lbm/s with deviation z-score of ${d.latestSensors.s20?.z}. The gas path expansion through LPT Station 5.0 shows T50 outlet temperature at ${d.latestSensors.s4?.value} °R. Borescope inspection of the first-stage nozzle guide vanes and thermal barrier coating is recommended within ${Math.max(1, d.predictedRul - 10)} cycles.`;
  } else if (q.includes("maint") || q.includes("action") || q.includes("recommend") || q.includes("when")) {
    const priority = d.healthStatus === "CRITICAL" ? "P1 Urgent" : d.healthStatus === "WARNING" ? "P2 High" : "P3 Routine";
    answer = `Recommended Action for ENG-${eid} (${priority}): ${d.maintenanceAction}. Projected maintenance deadline: inspect within ${Math.max(0, d.predictedRul - 10)} cycles (approximately ${(Math.max(0, d.predictedRul - 10) / 3).toFixed(0)} days at 3 flights/day). Work order should include HPC stage 4-9 borescope check and fuel nozzle spray pattern verification.`;
  } else if (q.includes("compare") || q.includes("model") || q.includes("lstm") || q.includes("gru") || q.includes("xgb")) {
    answer = `Multi-Model Assessment for ENG-${eid} (cycle ${c}): LSTM predicts ${d.lstmRul} cycles (MAE 12.8, NASA Score 342.5); GRU predicts ${d.gruRul} cycles (MAE 13.5); XGBoost predicts ${d.xgbRul} cycles (MAE 15.2). Model ensemble variance is ±${Math.abs(d.lstmRul - d.xgbRul)} cycles, showing high prediction consensus. Actual recorded ground truth reference is ${d.actualRul} cycles.`;
  } else {
    answer = `Telemetry summary for ENG-${eid} at operating cycle ${c}: System health score is ${d.healthScore}/100 with status ${d.healthStatus}. Core spool speed (Nc) is ${d.latestSensors.s9?.value} rpm and fan speed (Nf) is ${d.latestSensors.s8?.value} rpm. Remaining Useful Life prediction is ${Math.round(d.predictedRul)} cycles. Suggested inquiry: 'Why is EGT elevated?', 'HPT inspection status', or 'Model comparison'.`;
  }
  
  return { answer, sources };
}
