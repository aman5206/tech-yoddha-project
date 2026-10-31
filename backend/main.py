"""Run from repo root:  uvicorn backend.main:app --reload --port 8000"""
import os
from collections import defaultdict
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas.schemas import PredictRequest, PredictResponse
from backend.services.inference import Predictor
from backend.services.maintenance import classify

ART_DIR = os.getenv("AEROGUARD_ARTIFACTS", "artifacts/models")
DATA_DIR = os.getenv("AEROGUARD_DATA", "data/raw")
DATASET = os.getenv("AEROGUARD_DATASET", "FD001")

app = FastAPI(title="AeroGuard AI", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"],
                   allow_methods=["*"], allow_headers=["*"])

# In-memory stores for the prototype (swap for PostgreSQL later)
READINGS = defaultdict(list)
PREDICTIONS = defaultdict(list)
ALERTS = []


@lru_cache(maxsize=1)
def get_predictor() -> Predictor:
    try:
        return Predictor(ART_DIR)
    except FileNotFoundError:
        raise HTTPException(503, f"Model artifacts not found in '{ART_DIR}'. Train first.")


def _now():
    return datetime.now(timezone.utc).isoformat()


def _run_prediction(engine_id: str, rows, model=None) -> dict:
    p = get_predictor()
    try:
        r = p.predict(rows, model)
    except ValueError as e:
        raise HTTPException(422, str(e))
    status, action = classify(r["rul"])
    rec = {"engine_id": engine_id, "predicted_rul": round(r["rul"], 1), "health_status": status,
           "maintenance_action": action, "model": r["model"], "model_version": p.cfg["version"],
           "padded": r["padded"], "cycle": len(rows), "timestamp": _now()}
    last = PREDICTIONS[engine_id][-1]["health_status"] if PREDICTIONS[engine_id] else None
    PREDICTIONS[engine_id].append(rec)
    if status in ("WARNING", "CRITICAL") and status != last:
        ALERTS.append({"alert_id": len(ALERTS) + 1, "engine_id": engine_id, "severity": status,
                       "description": f"Predicted RUL {rec['predicted_rul']} cycles: {action}",
                       "status": "open", "created_at": rec["timestamp"]})
    return rec


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    return _run_prediction(req.engine_id, req.sensor_data, req.model)


@app.post("/engine/upload")
def upload(req: PredictRequest):
    p = get_predictor()
    if any(len(r) != len(p.features) for r in req.sensor_data):
        raise HTTPException(422, f"Each row needs {len(p.features)} values.")
    READINGS[req.engine_id].extend(req.sensor_data)
    return {"engine_id": req.engine_id, "stored_cycles": len(READINGS[req.engine_id])}


@app.get("/engine/{engine_id}")
def engine(engine_id: str):
    if engine_id not in READINGS and engine_id not in PREDICTIONS:
        raise HTTPException(404, "Unknown engine")
    return {"engine_id": engine_id, "cycles_stored": len(READINGS[engine_id]),
            "prediction_history": PREDICTIONS[engine_id]}


@app.get("/engine/{engine_id}/health")
def health(engine_id: str):
    if not PREDICTIONS[engine_id]:
        raise HTTPException(404, "No predictions for this engine yet")
    return PREDICTIONS[engine_id][-1]


@app.get("/alerts")
def alerts():
    return ALERTS


@app.get("/analytics")
def analytics():
    latest = [h[-1] for h in PREDICTIONS.values() if h]
    counts = {s: sum(1 for x in latest if x["health_status"] == s)
              for s in ("HEALTHY", "MONITOR", "WARNING", "CRITICAL")}
    avg = round(sum(x["predicted_rul"] for x in latest) / len(latest), 1) if latest else None
    return {"engines": len(latest), "status_counts": counts, "average_rul": avg,
            "open_alerts": sum(a["status"] == "open" for a in ALERTS)}


@app.get("/models/status")
def models_status():
    p = get_predictor()
    res = Path(ART_DIR) / "results.json"
    import json
    return {"version": p.cfg["version"], "dataset": p.cfg["dataset"], "default_model": p.default_model,
            "available_models": list(p.models), "seq_len": p.seq_len, "features": p.features,
            "metrics": json.loads(res.read_text()) if res.exists() else None}


# ---- simulation helper: replay a test engine up to a given cycle ----------
@lru_cache(maxsize=1)
def _test_data():
    from src.data.load_data import load_rul, load_test
    return load_test(DATA_DIR, DATASET), load_rul(DATA_DIR, DATASET)


@app.get("/simulation/{engine_id}/cycle/{cycle}")
def simulate(engine_id: int, cycle: int, model: str = None):
    try:
        test, rul = _test_data()
    except FileNotFoundError:
        raise HTTPException(503, "Test data not found in data/raw")
    g = test[test.engine_id == engine_id].sort_values("cycle")
    if g.empty:
        raise HTTPException(404, "Unknown test engine")
    max_c = int(g.cycle.max())
    cycle = max(1, min(cycle, max_c))
    rows = g[g.cycle <= cycle][get_predictor().features].to_numpy().tolist()
    rec = _run_prediction(f"TEST-{engine_id}", rows, model)
    actual = int(rul.set_index("engine_id").loc[engine_id, "RUL_final"]) + max_c - cycle
    return {**rec, "cycle": cycle, "max_cycle": max_c, "actual_rul": actual}


# ======================= Fleet, sensors, maintenance =======================
from collections import Counter
from datetime import timedelta
from pydantic import BaseModel

CYCLES_PER_DAY = float(os.getenv("AEROGUARD_CYCLES_PER_DAY", "3"))  # assumption used to convert cycles to dates
SAFETY_MARGIN = 10  # cycles kept in reserve before the inspection deadline
PRIORITY = {"CRITICAL": "P1 Urgent", "WARNING": "P2 High", "MONITOR": "P3 Routine", "HEALTHY": "P4 None"}
HISTORY = []

# Names follow the NASA C-MAPSS documentation. C-MAPSS has no vibration or oil-pressure channel.
SENSOR_GROUPS = {
    "Temperature": {"s2": "LPC outlet temp (T24)", "s3": "HPC outlet temp (T30)", "s4": "LPT outlet temp (T50)"},
    "Pressure": {"s7": "HPC outlet pressure (P30)", "s11": "HPC static pressure (Ps30)"},
    "Spool speed": {"s8": "Fan speed (Nf)", "s9": "Core speed (Nc)"},
    "Coolant bleed": {"s20": "HPT coolant bleed (W31)", "s21": "LPT coolant bleed (W32)"},
}


def _schedule(rul, status):
    cycles = max(0, int(rul - SAFETY_MARGIN))
    by = datetime.now(timezone.utc) + timedelta(days=cycles / CYCLES_PER_DAY)
    return {"inspect_within_cycles": cycles, "inspect_by": by.date().isoformat(), "priority": PRIORITY[status]}


@lru_cache(maxsize=1)
def _fleet_snapshot():
    p = get_predictor()
    test, _ = _test_data()
    out = []
    for eid, g in test.groupby("engine_id"):
        g = g.sort_values("cycle")
        rul = p.predict(g[p.features].to_numpy().tolist())["rul"]
        status, action = classify(rul)
        out.append({"engine_id": int(eid), "cycle": int(g.cycle.max()), "predicted_rul": round(rul, 1),
                    "health_status": status, "maintenance_action": action, **_schedule(rul, status)})
    return out


@app.get("/fleet")
def fleet():
    try:
        snap = _fleet_snapshot()
    except FileNotFoundError:
        raise HTTPException(503, "Test data not found in data/raw")
    last = {h["engine_id"]: h["date"] for h in HISTORY}
    engines = sorted(({**e, "last_inspection": last.get(e["engine_id"])} for e in snap),
                     key=lambda e: e["predicted_rul"])
    c = Counter(e["health_status"] for e in engines)
    return {"total": len(engines), "healthy": c["HEALTHY"], "attention": c["MONITOR"] + c["WARNING"],
            "critical": c["CRITICAL"], "cycles_per_day_assumption": CYCLES_PER_DAY,
            "average_rul": round(sum(e["predicted_rul"] for e in engines) / len(engines), 1), "engines": engines}


@app.get("/sensors/{engine_id}")
def sensors(engine_id: int, upto: int = 100000):
    """% change vs the engine's own early-life baseline (first 30 cycles) plus a deviation flag (|z| > 3).
    This is a simple baseline-deviation indicator, not the planned Isolation Forest / autoencoder."""
    test, _ = _test_data()
    g = test[test.engine_id == engine_id].sort_values("cycle")
    if g.empty:
        raise HTTPException(404, "Unknown test engine")
    g = g[g.cycle <= upto]
    names = {s: n for grp in SENSOR_GROUPS.values() for s, n in grp.items()}
    cols = list(names)
    base = g.head(30)[cols]
    mu = base.mean()
    sd = base.std().fillna(0).clip(lower=1e-4) .combine(mu.abs() * 1e-4, max)
    pct, z = (g[cols] / mu - 1) * 100, (g[cols] - mu) / sd
    rows = [{"cycle": int(c), **{s: round(float(pct[s].iloc[i]), 3) for s in cols}}
            for i, c in enumerate(g.cycle)]
    li = len(g) - 1
    latest = {s: {"label": names[s], "value": round(float(g[s].iloc[li]), 3), "pct": round(float(pct[s].iloc[li]), 3),
                  "z": round(float(z[s].iloc[li]), 2), "flag": bool(abs(z[s].iloc[li]) > 3)} for s in cols}
    return {"groups": {k: list(v) for k, v in SENSOR_GROUPS.items()}, "rows": rows, "latest": latest,
            "anomaly_score": round(sum(v["flag"] for v in latest.values()) / len(cols), 2),
            "baseline_cycles": min(30, len(g))}


class LogRequest(BaseModel):
    action: str = "Inspection completed"
    notes: str = ""


@app.post("/maintenance/{engine_id}/log")
def log_maintenance(engine_id: int, req: LogRequest):
    rec = {"id": len(HISTORY) + 1, "engine_id": engine_id, "action": req.action,
           "notes": req.notes, "date": _now()[:10]}
    HISTORY.append(rec)
    return rec


@app.get("/maintenance/history")
def maintenance_history():
    return HISTORY[::-1]


# ======================= History, compare, heatmap, alerts, assistant =======================
import json as _json


@lru_cache(maxsize=256)
def _history(engine_id: int, step: int, model: str):
    p = get_predictor()
    test, rul = _test_data()
    g = test[test.engine_id == engine_id].sort_values("cycle")
    if g.empty:
        raise HTTPException(404, "Unknown test engine")
    mx = int(g.cycle.max())
    final = int(rul.set_index("engine_id").loc[engine_id, "RUL_final"])
    X = g[p.features].to_numpy().tolist()
    preds = []
    for c in list(range(step, mx, step)) + [mx]:
        r = p.predict(X[:c], model or None)["rul"]
        preds.append({"cycle": c, "predicted_rul": round(r, 1), "actual_rul": final + mx - c,
                      "health_status": classify(r)[0]})
    ids = [s for grp in SENSOR_GROUPS.values() for s in grp]
    readings = _json.loads(g[["cycle"] + ids].round(3).to_json(orient="records"))
    return {"engine_id": engine_id, "max_cycle": mx, "final_rul": final, "model": model or p.default_model,
            "predictions": preds, "readings": readings,
            "sensors": {s: n for grp in SENSOR_GROUPS.values() for s, n in grp.items()}}


@app.get("/engine/{engine_id}/history")
def engine_history(engine_id: int, step: int = 5, model: str = ""):
    try:
        return _history(engine_id, max(1, step), model)
    except FileNotFoundError:
        raise HTTPException(503, "Test data not found in data/raw")


@app.get("/compare/{engine_id}/{cycle}")
def compare(engine_id: int, cycle: int):
    p = get_predictor()
    test, rul = _test_data()
    g = test[test.engine_id == engine_id].sort_values("cycle")
    if g.empty:
        raise HTTPException(404, "Unknown test engine")
    mx = int(g.cycle.max())
    cycle = max(1, min(cycle, mx))
    rows = g[g.cycle <= cycle][p.features].to_numpy().tolist()
    out = {}
    for m in p.models:
        r = p.predict(rows, m)["rul"]
        out[m] = {"predicted_rul": round(r, 1), "health_status": classify(r)[0]}
    vals = [v["predicted_rul"] for v in out.values()]
    final = int(rul.set_index("engine_id").loc[engine_id, "RUL_final"])
    return {"engine_id": engine_id, "cycle": cycle, "max_cycle": mx, "actual_rul": final + mx - cycle,
            "models": out, "spread": [min(vals), max(vals)], "default_model": p.default_model}


@lru_cache(maxsize=1)
def _heatmap():
    test, _ = _test_data()
    ids = [s for grp in SENSOR_GROUPS.values() for s in grp]
    rows = []
    for eid, g in test.groupby("engine_id"):
        g = g.sort_values("cycle")
        mu = g.head(30)[ids].mean()
        pct = (g[ids].iloc[-1] / mu - 1) * 100
        rows.append({"engine_id": int(eid), **{s: round(float(pct[s]), 2) for s in ids}})
    return {"sensors": {s: n for grp in SENSOR_GROUPS.values() for s, n in grp.items()}, "rows": rows}


@app.get("/heatmap")
def heatmap():
    try:
        return _heatmap()
    except FileNotFoundError:
        raise HTTPException(503, "Test data not found in data/raw")


@app.post("/alerts/{alert_id}/ack")
def ack_alert(alert_id: int):
    for a in ALERTS:
        if a["alert_id"] == alert_id:
            a["status"] = "acknowledged"
            return a
    raise HTTPException(404, "Unknown alert")


class AskRequest(BaseModel):
    question: str
    engine_id: int | None = None
    cycle: int | None = None


@app.post("/assistant")
def assistant(req: AskRequest):
    """Rule-based assistant that only reports numbers read from the stored project data (no LLM)."""
    q, parts, sources = req.question.lower(), [], []
    p = get_predictor()
    res = Path(ART_DIR) / "results.json"
    metrics = _json.loads(res.read_text()) if res.exists() else {}
    if req.engine_id:
        test, _ = _test_data()
        g = test[test.engine_id == req.engine_id]
        if g.empty:
            raise HTTPException(404, "Unknown test engine")
        cyc = min(req.cycle or int(g.cycle.max()), int(g.cycle.max()))
        c, s = compare(req.engine_id, cyc), sensors(req.engine_id, cyc)
        d = c["models"][p.default_model]
        parts.append(f"ENG-{req.engine_id} at cycle {cyc}: the {p.default_model.upper()} model estimates about "
                     f"{round(d['predicted_rul'])} cycles remaining (status {d['health_status']}); the recorded reference is "
                     f"{c['actual_rul']}. Models range from {c['spread'][0]} to {c['spread'][1]} cycles.")
        sources += ["/compare", "/sensors"]
        top = sorted(s["latest"].items(), key=lambda kv: -abs(kv[1]["z"]))[:3]
        if any(k in q for k in ("why", "anomal", "sensor", "explain", "critical", "warning")):
            parts.append("Largest deviations from this engine's early-life baseline: " + "; ".join(
                f"{v['label']} {v['pct']:+.2f}% (z={v['z']})" for _, v in top) + ". A deviation is not proof of failure.")
        if any(k in q for k in ("maint", "inspect", "should", "recommend", "when")):
            sc = _schedule(d["predicted_rul"], d["health_status"])
            parts.append(f"Model-informed suggestion for human review: {sc['priority']}, inspect within about "
                         f"{sc['inspect_within_cycles']} cycles (around {sc['inspect_by']} at {CYCLES_PER_DAY:g} cycles/day assumed).")
    else:
        parts.append("Select an engine to ask engine-specific questions.")
    if any(k in q for k in ("model", "compare", "lstm", "gru", "xgb", "accura")) and metrics:
        parts.append("Test-set results (true RUL capped at 125): " + "; ".join(
            f"{m.upper()} MAE {v['test_capped']['mae']:.1f}, RMSE {v['test_capped']['rmse']:.1f}, NASA score "
            f"{v['test_capped']['nasa_score']:.0f}" for m, v in metrics.items()) + ".")
        sources.append("results.json")
    parts.append("Prototype output, not an aviation maintenance authorization.")
    return {"answer": " ".join(parts), "sources": sources or ["project data"]}
