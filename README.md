# AeroGuard AI (code scaffold)

1. `pip install -r requirements.txt`
2. Put `train_FD001.txt`, `test_FD001.txt`, `RUL_FD001.txt` in `data/raw/` (NASA PCoE C-MAPSS).
3. Train: `python -m src.models.train_models --dataset FD001 --epochs 50`
   Outputs in `artifacts/models/` (models, scaler, config.json, results.json).
4. Serve: `uvicorn backend.main:app --reload --port 8000`  (docs at /docs)
5. Simulate: `python -m simulation.engine_simulator --engine 24`
6. Frontend: `cd frontend && cp .env.local.example .env.local && npm install && npm run dev` (http://localhost:3000). The API needs `data/raw/*_FD001.txt` for fleet, sensor, history and simulation data.

Prototype only: thresholds are illustrative, not certified maintenance limits.

## Frontend pages and data sources (all real API data, no mocks)
Dashboard (/fleet, /alerts), Engine History (/engine/{id}/history, /sensors), Engine Simulation (/simulation, /sensors, 3D via react-three-fiber),
Failure Prediction (/compare, /models/status), RUL Monitoring (/engine/{id}/history per model), Maintenance Center (/fleet, /maintenance),
Analytics (/heatmap, /sensors), Alerts Center (/alerts, /alerts/{id}/ack), AI Assistant (/assistant, rule-based), Settings (localStorage).
Limits: no SHAP (sensor contribution uses baseline z-scores), no statistical confidence intervals (shows model spread), no vibration channel in C-MAPSS,
review status is browser-only, maintenance history is in-memory on the server.
