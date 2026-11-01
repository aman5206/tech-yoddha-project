"use client";
import React, { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { EngineModelLoader } from "./EngineModelLoader";
import { VisualizationMode } from "./EngineMaterials";
import { SensorInfo } from "../../lib/dataService";
import {
  RotateCcw,
  Wind,
  Eye,
  Layers,
  Thermometer,
  ShieldCheck,
  Radio,
  Sliders,
} from "lucide-react";

export interface EngineSceneProps {
  speed?: number;
  cutaway?: boolean;
  color?: string;
  onHover?: (name: string | null) => void;
  label?: string;
  initialMode?: VisualizationMode;
  interactive?: boolean;
  selectedComponent?: string | null;
  onSelectComponent?: (id: string | null) => void;
  componentHealth?: Record<string, number>;
  latestSensors?: Record<string, SensorInfo>;
  selectedSensor?: string | null;
  onSelectSensor?: (sensorKey: string) => void;
  showToolbar?: boolean;
  height?: number | string;
  customModelUrl?: string;
}

export function EngineScene({
  speed = 1.0,
  cutaway = false,
  color = "#38bdf8",
  onHover,
  label,
  initialMode,
  interactive = true,
  selectedComponent: extSelectedComponent,
  onSelectComponent: extOnSelectComponent,
  componentHealth,
  latestSensors,
  selectedSensor,
  onSelectSensor,
  showToolbar = true,
  height = 440,
  customModelUrl,
}: EngineSceneProps) {
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [mode, setMode] = useState<VisualizationMode>(
    initialMode || (cutaway ? "cutaway" : "standard")
  );
  const [internalHover, setInternalHover] = useState<string | null>(null);
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [showAirflow, setShowAirflow] = useState(true);
  const [explodedAmount, setExplodedAmount] = useState(0.85);

  const controlsRef = useRef<any>(null);

  const selectedComp = extSelectedComponent !== undefined ? extSelectedComponent : internalSelected;
  const setSelectedComp = extOnSelectComponent || setInternalSelected;

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setWebGlSupported(!!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
    } catch {
      setWebGlSupported(false);
    }
  }, []);

  useEffect(() => {
    if (cutaway) setMode("cutaway");
  }, [cutaway]);

  const handleHover = (n: string | null) => {
    setInternalHover(n);
    onHover?.(n);
  };

  // Camera preset positions
  const setCameraPreset = (preset: "front" | "side" | "top" | "rear" | "iso" | "reset") => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    switch (preset) {
      case "front":
        ctrl.object.position.set(0, 0, -6.6);
        ctrl.target.set(0, 0, 0);
        break;
      case "side":
        ctrl.object.position.set(6.8, 0, 0);
        ctrl.target.set(0, 0, 0);
        break;
      case "top":
        ctrl.object.position.set(0, 7.2, 0);
        ctrl.target.set(0, 0, 0);
        break;
      case "rear":
        ctrl.object.position.set(0, 0, 6.8);
        ctrl.target.set(0, 0, 0);
        break;
      case "iso":
      case "reset":
        ctrl.object.position.set(5.2, 2.6, 5.2);
        ctrl.target.set(0, 0, 0);
        break;
    }
    ctrl.update();
  };

  return (
    <div
      className="stage"
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        position: "relative",
        background: "radial-gradient(ellipse at 50% 45%, #152332 0%, #070d14 100%)",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #1e2f42",
      }}
      role="img"
      aria-label={label ?? "Aerospace Turbofan Engine Digital Twin"}
    >
      {webGlSupported ? (
        <Canvas
          dpr={[1, 2]}
          gl={{
            localClippingEnabled: true,
            antialias: true,
            powerPreference: "high-performance",
          }}
        >
          <PerspectiveCamera makeDefault position={[5.2, 2.6, 5.2]} fov={38} />
          
          {/* Engineering 3-Point PBR Lighting Rig */}
          <ambientLight intensity={0.65} />
          <directionalLight position={[6, 8, 5]} intensity={1.5} castShadow />
          <directionalLight position={[-6, -4, -4]} intensity={0.65} />
          <directionalLight position={[0, -5, 0]} intensity={0.3} />
          <pointLight position={[0, 0, 0]} intensity={0.5} color="#38bdf8" />

          {/* Turbofan Assembly Model Loader */}
          <EngineModelLoader
            mode={mode}
            speed={speed}
            explodedAmount={explodedAmount}
            selectedComponent={selectedComp}
            hoveredComponent={internalHover}
            onSelectComponent={setSelectedComp}
            onHoverComponent={handleHover}
            componentHealth={componentHealth}
            latestSensors={latestSensors}
            showAirflow={showAirflow}
            selectedSensor={selectedSensor}
            onSelectSensor={onSelectSensor}
            customModelUrl={customModelUrl}
          />

          <OrbitControls
            ref={controlsRef}
            enablePan={interactive}
            enableZoom={interactive}
            enableRotate={interactive}
            minDistance={2.4}
            maxDistance={14}
            dampingFactor={0.08}
          />
        </Canvas>
      ) : (
        <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
          <p>WebGL Hardware Acceleration is unavailable on this device.</p>
        </div>
      )}

      {/* Floating Mode Toolbar */}
      {showToolbar && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            display: "flex",
            gap: "5px",
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(8px)",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #334155",
            zIndex: 10,
          }}
        >
          <button
            title="Standard PBR Rendering"
            onClick={() => setMode("standard")}
            style={{
              background: mode === "standard" ? "#0284c7" : "transparent",
              border: 0,
              color: "#f8fafc",
              padding: "5px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Standard
          </button>
          <button
            title="Longitudinal Section Cutaway"
            onClick={() => setMode("cutaway")}
            style={{
              background: mode === "cutaway" ? "#0284c7" : "transparent",
              border: 0,
              color: "#f8fafc",
              padding: "5px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Cutaway
          </button>
          <button
            title="Exploded Assembly View"
            onClick={() => setMode("exploded")}
            style={{
              background: mode === "exploded" ? "#0284c7" : "transparent",
              border: 0,
              color: "#f8fafc",
              padding: "5px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Exploded
          </button>
          <button
            title="X-Ray Internal Structures"
            onClick={() => setMode("xray")}
            style={{
              background: mode === "xray" ? "#0284c7" : "transparent",
              border: 0,
              color: "#f8fafc",
              padding: "5px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            X-Ray
          </button>
          <button
            title="CAD Wireframe Topology"
            onClick={() => setMode("wireframe")}
            style={{
              background: mode === "wireframe" ? "#0284c7" : "transparent",
              border: 0,
              color: "#f8fafc",
              padding: "5px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Wireframe
          </button>
          <button
            title="Thermal Infrared Thermogram"
            onClick={() => setMode("thermal")}
            style={{
              background: mode === "thermal" ? "#0284c7" : "transparent",
              border: 0,
              color: "#f8fafc",
              padding: "5px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Thermal
          </button>
          <button
            title="Component Health Map"
            onClick={() => setMode("health")}
            style={{
              background: mode === "health" ? "#0284c7" : "transparent",
              border: 0,
              color: "#f8fafc",
              padding: "5px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Health
          </button>
          <button
            title="NASA C-MAPSS Sensor Stations"
            onClick={() => setMode("sensor")}
            style={{
              background: mode === "sensor" ? "#0284c7" : "transparent",
              border: 0,
              color: "#f8fafc",
              padding: "5px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            Sensors
          </button>
        </div>
      )}

      {/* Camera Presets (Top Right) */}
      {showToolbar && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            display: "flex",
            gap: "5px",
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(8px)",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #334155",
            zIndex: 10,
          }}
        >
          <button
            title="Inlet (Front View)"
            onClick={() => setCameraPreset("front")}
            style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", fontSize: "11px" }}
          >
            Inlet
          </button>
          <span style={{ color: "#334155" }}>|</span>
          <button
            title="Profile (Side View)"
            onClick={() => setCameraPreset("side")}
            style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", fontSize: "11px" }}
          >
            Profile
          </button>
          <span style={{ color: "#334155" }}>|</span>
          <button
            title="Plan (Top View)"
            onClick={() => setCameraPreset("top")}
            style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", fontSize: "11px" }}
          >
            Top
          </button>
          <span style={{ color: "#334155" }}>|</span>
          <button
            title="Exhaust (Rear View)"
            onClick={() => setCameraPreset("rear")}
            style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", fontSize: "11px" }}
          >
            Exhaust
          </button>
          <span style={{ color: "#334155" }}>|</span>
          <button
            title="Reset to Isometric View"
            onClick={() => setCameraPreset("reset")}
            style={{ background: "transparent", border: 0, color: "#38bdf8", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <RotateCcw size={12} />
          </button>
        </div>
      )}

      {/* Inspection Tooltip Badge (Bottom Left) */}
      {(internalHover || selectedComp) && (
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            background: "rgba(15, 23, 42, 0.92)",
            border: "1px solid #0284c7",
            padding: "6px 12px",
            borderRadius: "5px",
            fontSize: "12px",
            color: "#f8fafc",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 10,
            boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8" }} />
          <span>{selectedComp ? `Selected: ${selectedComp}` : `Inspecting: ${internalHover}`}</span>
        </div>
      )}
    </div>
  );
}

