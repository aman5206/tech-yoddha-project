# AeroGuard AI — Professional 3D Aerospace Predictive Maintenance & Digital Twin Platform

**Team:** Tech Yodhas  
**Team Leader:** Aditya Bijore  
**Domain:** Aerospace Engineering + AI + Predictive Maintenance + Digital Twin  
**Dataset:** NASA Commercial Modular Aero-Propulsion System Simulation (C-MAPSS FD001)

---

## 1. Executive Summary

**AeroGuard AI** is an advanced aerospace digital twin and predictive maintenance platform engineered for aircraft fleet operators, propulsion reliability engineers, and maintenance specialists. 

The platform monitors aircraft turbofan engine sensor telemetry, detects anomaly patterns across 21 engine stations, predicts Remaining Useful Life (RUL) with deep learning ensembles, and maps physical degradation directly onto an interactive, highly detailed **3D turbofan engine digital twin**.

---

## 2. Signature 3D Turbofan Digital Twin Studio

The visual centerpiece of AeroGuard AI is an authentic 3D turbofan engine digital twin built with Three.js and React Three Fiber:

### Physically Modeled Subsystems & Gas Path:
1. **Front Section:**
   - 24 curved wide-chord titanium fan blades with aerodynamic twist from root to tip
   - Precision multi-faceted fan hub disk
   - Ogival spinner cone with spiral warning stripe
   - Outer composite nacelle cowling and polished titanium intake lip
   - Bypass duct with structural outlet guide vanes (OGVs)
2. **Compressor Section:**
   - 3-stage Low-Pressure Compressor (LPC / Booster)
   - 9-stage High-Pressure Compressor (HPC) with aerodynamic chord taper along the gas path
   - Split compressor outer casing with bleed ports
3. **Dual-Spool Shaft System:**
   - Inner N1 concentric low-pressure shaft connecting Fan & LPC to LPT
   - Outer hollow N2 high-pressure shaft connecting HPC to HPT
   - Pressurized bearing chambers (#1 through #5)
4. **Combustion Section:**
   - Annular combustor outer and inner perforated liners
   - Ring of 18 dual-orifice fuel spray nozzles with aerodynamic swirlers
   - High-pressure fuel manifold ring
   - Volumetric flame zone with thermal emission
5. **Turbine Section:**
   - 2-stage High-Pressure Turbine (HPT) with single-crystal superalloy blades
   - 4-stage Low-Pressure Turbine (LPT) shrouded blades driving the N1 spool
6. **Rear Section:**
   - Core convergent exhaust nozzle
   - Aerodynamic center exhaust cone / tail plug
7. **Auxiliary Systems:**
   - Fan-case mounted Accessory Gearbox (AGB)
   - Radial tower drive shaft and transfer gearbox
   - Lubrication scavenge filter and high-pressure fuel metering pump
   - Dynamic airflow particle streams (cool bypass air & hot core combustion flow)

### Interactive 3D Visualization Modes:
- **Standard:** Photorealistic PBR aerospace materials (titanium, nickel superalloy, inconel, composite cowl)
- **Cutaway:** Longitudinal section cutaway revealing internal rotating blisks, combustor liners, and turbine disks
- **Exploded View:** Smoothly offsets assemblies along longitudinal axes for component inspection
- **X-Ray:** Holographic semi-transparent casing with glowing internal core and bearing shafts
- **Wireframe:** CAD engineering wireframe with accent vertices
- **Thermal IR:** Full infrared thermogram (280K ambient inlet to >1700K combustor flame zone)
- **Health Map:** Component color-coding mapped to real-time computed health scores (Green/Amber/Red)
- **Sensors:** 3D interactive beacon pins with live HUD floating badges and click-to-telemetry

---

## 3. Platform Architecture & Modules

The platform includes all 16 required aerospace engineering workspaces:

1. **Fleet Command Center (`/`):** Fleet KPI metrics, health distribution, RUL histograms, risk matrix, and risk-prioritized engine queue.
2. **3D Digital Twin Studio (`/twin`):** Dedicated full-screen studio with camera presets, mode switching, component isolation, live station parameters, and bottom timeline scrubber.
3. **Engine Comparison Lab (`/compare`):** Side-by-side 3D engines, component health radar chart, and multi-engine sensor deviation comparison.
4. **Sensor Intelligence Center (`/sensors`):** 21 NASA C-MAPSS channels with physical station mappings (T24, T30, T50, P30, Ps30, Nf, Nc, W31, W32), time-series charts, and 3D station sync.
5. **Failure Prediction (`/prediction`):** Risk classification, multi-model RUL spread, and z-score deviation contributions.
6. **RUL Monitoring (`/rul`):** Degradation trajectories, actual vs predicted curves, and model spread uncertainty bands.
7. **Simulation Lab (`/simulation`):** Dynamic playback with synchronized 3D rotation, live sensor tiles, and threshold alerts.
8. **Maintenance Intelligence Center (`/maintenance`):** Risk-prioritized queue, work orders, borescope recommendations, and CSV export.
9. **Alerts & Anomaly Center (`/alerts`):** Critical/Warning/Informational queues with one-click navigation to the 3D twin.
10. **AI Copilot (`/assistant`):** Context-aware engineering assistant with Technical and Simplified response modes.
11. **Reports Center (`/reports`):** Full technical airworthiness audit document with printable / PDF layout.
12. **Model Transparency (`/transparency`):** Architecture specs for LSTM, GRU, XGBoost, and NASA scoring metrics.
13. **Scenario / What-If Lab (`/scenario`):** Parameter tuning (thermal stress bias, seal degradation rate, flight frequency) and simulated life impact.
14. **Data Quality Center (`/data-quality`):** Telemetry integrity metrics (100% completeness, outlier rate, SNR).
15. **Engine History (`/history`):** Historical trend analysis and multi-channel sensor inspection.
16. **Settings (`/settings`):** Workspace customization, model defaults, reduced motion, and operator profile.

---

## 4. Getting Started

### Prerequisites:
- Node.js v18+ (tested on Node.js v24)
- Python 3.10+ (optional for live FastAPI backend)

### 1. Launch Frontend:
```bash
cd aero-guard-ai/frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

*Note: The frontend includes a robust, high-fidelity NASA C-MAPSS physics and simulation engine. If the FastAPI backend is not running, it automatically operates in offline simulation mode with complete fidelity.*

### 2. Optional: Launch Python AI Backend:
```bash
cd aero-guard-ai
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```
Interactive API documentation will be available at **http://localhost:8000/docs**.

---

## 5. Engineering Team Attribution

- **Project:** AeroGuard AI
- **Team:** Tech Yodhas
- **Team Leader:** Aditya Bijore
- **Competition:** National-Level Aerospace Engineering & Predictive Maintenance Hackathon
