"use client";
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getTurbofanMaterial, VisualizationMode } from "./EngineMaterials";
import { getExplodedOffsets } from "./EngineExplodedView";
import { TURBOFAN_COMPONENT_REGISTRY } from "./ComponentRegistry";
import { SensorInfo } from "../../lib/dataService";
import { Html } from "@react-three/drei";

export interface AerospaceTurbofanCADProps {
  mode: VisualizationMode;
  speed: number;
  explodedAmount: number;
  selectedComponent: string | null;
  hoveredComponent: string | null;
  onSelectComponent: (id: string | null) => void;
  onHoverComponent: (id: string | null) => void;
  componentHealth?: Record<string, number>;
  latestSensors?: Record<string, SensorInfo>;
  showAirflow?: boolean;
  selectedSensor?: string | null;
  onSelectSensor?: (sensorKey: string) => void;
  reducedMotion?: boolean;
}

/**
 * Procedural authentic aerofoil blade geometry generator
 * Creates curved, twisted wide-chord blades with camber and thickness distribution
 */
function createCurvedAerofoilBlade(
  height: number,
  rootChord: number,
  tipChord: number,
  twistAngleRad: number,
  camberAmount = 0.08
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const segmentsY = 12; // Along blade span
  const segmentsX = 8; // Along blade chord

  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  for (let j = 0; j <= segmentsY; j++) {
    const v = j / segmentsY;
    const currentHeight = v * height;
    const currentChord = rootChord + (tipChord - rootChord) * v;
    const currentTwist = (1 - v) * twistAngleRad; // Highest stagger at root, untwists at tip

    for (let i = 0; i <= segmentsX; i++) {
      const u = i / segmentsX;
      // Cambered aerofoil centerline (NACA 4-digit style curvature)
      const x0 = (u - 0.5) * currentChord;
      const thickness = 4 * 0.12 * currentChord * (0.2969 * Math.sqrt(Math.max(0, u)) - 0.126 * u - 0.3516 * u * u + 0.2843 * u * u * u - 0.1015 * u * u * u * u);
      const camberY = 4 * camberAmount * currentChord * (u - u * u);

      // Rotate by twist angle
      const rotX = x0 * Math.cos(currentTwist) - (camberY + thickness * 0.5) * Math.sin(currentTwist);
      const rotZ = x0 * Math.sin(currentTwist) + (camberY + thickness * 0.5) * Math.cos(currentTwist);

      vertices.push(rotX, currentHeight, rotZ);
      uvs.push(u, v);
    }
  }

  // Generate quad indices
  for (let j = 0; j < segmentsY; j++) {
    for (let i = 0; i < segmentsX; i++) {
      const a = j * (segmentsX + 1) + i;
      const b = j * (segmentsX + 1) + i + 1;
      const c = (j + 1) * (segmentsX + 1) + i + 1;
      const d = (j + 1) * (segmentsX + 1) + i;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

export function AerospaceTurbofanCAD({
  mode,
  speed,
  explodedAmount,
  selectedComponent,
  hoveredComponent,
  onSelectComponent,
  onHoverComponent,
  componentHealth = {},
  latestSensors = {},
  showAirflow = true,
  selectedSensor,
  onSelectSensor,
  reducedMotion = false,
}: AerospaceTurbofanCADProps) {
  const n1SpoolRef = useRef<THREE.Group>(null);
  const n2SpoolRef = useRef<THREE.Group>(null);

  // Longitudinal cutaway clipping plane (quarter section or half section cut)
  const cutawayPlanes = useMemo(() => {
    if (mode === "cutaway") {
      return [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)];
    }
    return [];
  }, [mode]);

  // Delta-time based differential spool kinematics: N1 fan vs N2 high-pressure core
  useFrame((_, delta) => {
    if (reducedMotion || speed <= 0) return;
    const dt = Math.min(delta, 0.1) * speed;

    if (n1SpoolRef.current) {
      n1SpoolRef.current.rotation.z += dt * 3.4; // N1 Low-Pressure Spool (Fan & LPC & LPT)
    }
    if (n2SpoolRef.current) {
      n2SpoolRef.current.rotation.z += dt * 7.8; // N2 Core Spool (HPC & HPT) rotates ~2.3x faster
    }
  });

  const offsets = getExplodedOffsets(mode === "exploded" ? (explodedAmount || 1.0) : 0);

  // Helper to construct interactive mesh bindings
  const bind = (id: string) => ({
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelectComponent(selectedComponent === id ? null : id);
    },
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onHoverComponent(id);
    },
    onPointerOut: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onHoverComponent(null);
    },
  });

  // Material builder helper
  const mat = (id: string, color: string, metalness = 0.88, roughness = 0.22, isCasing = false) => {
    return getTurbofanMaterial(
      {
        mode,
        componentId: id,
        selectedId: selectedComponent,
        hoveredId: hoveredComponent,
        healthScore: componentHealth[id] ?? 88,
        clippingPlanes: cutawayPlanes,
        isCasing,
      },
      { color, metalness, roughness }
    );
  };

  // Precompute blade geometries
  const fanBladeGeometry = useMemo(() => {
    return createCurvedAerofoilBlade(0.96, 0.38, 0.24, 0.58, 0.09);
  }, []);

  const ogvBladeGeometry = useMemo(() => {
    return createCurvedAerofoilBlade(0.55, 0.22, 0.16, 0.2, 0.04);
  }, []);

  // Sensor hotspot locations physically placed along engine stations
  const sensorLocations = [
    { key: "s2", label: "T24 LPC Temp", pos: [0, 0.72, -1.2 + offsets.lpcZ] as [number, number, number], comp: "LPC_BOOSTER" },
    { key: "s3", label: "T30 HPC Outlet Temp", pos: [0, 0.52, 0.1 + offsets.hpcZ] as [number, number, number], comp: "HPC_CORE" },
    { key: "s7", label: "P30 HPC Pressure", pos: [0.48, 0, 0.1 + offsets.hpcZ] as [number, number, number], comp: "HPC_CORE" },
    { key: "s11", label: "Ps30 HPC Static Pressure", pos: [-0.48, 0, 0.1 + offsets.hpcZ] as [number, number, number], comp: "HPC_CORE" },
    { key: "s4", label: "T50 LPT Exhaust Temp", pos: [0, 0.62, 1.4 + offsets.lptZ] as [number, number, number], comp: "LPT_TURBINE" },
    { key: "s8", label: "Nf Fan Spool Speed", pos: [0, 0.35, -1.8 + offsets.fanZ] as [number, number, number], comp: "FAN_BLADES" },
    { key: "s9", label: "Nc Core Spool Speed", pos: [0, 0.32, -0.2 + offsets.hpcZ] as [number, number, number], comp: "HPC_CORE" },
    { key: "s20", label: "W31 HPT Coolant Bleed", pos: [0.38, 0.32, 0.7 + offsets.hptZ] as [number, number, number], comp: "HPT_STAGE_1" },
    { key: "s21", label: "W32 LPT Coolant Bleed", pos: [-0.38, 0.32, 1.2 + offsets.lptZ] as [number, number, number], comp: "LPT_TURBINE" },
  ];

  return (
    <group dispose={null}>
      {/* ========================================================================= */}
      {/* 1. NACELLE, INLET LIP & BYPASS DUCT CASING                                */}
      {/* ========================================================================= */}
      <group position={[offsets.nacelleX, 0, 0]} {...bind("FAN_CASING")}>
        {/* Aerodynamic Titanium Inlet Lip (Polished Torus) */}
        <mesh position={[0, 0, -2.32]}>
          <torusGeometry args={[1.52, 0.09, 20, 64]} />
          <primitive object={mat("FAN_CASING", "#cbd5e1", 0.94, 0.12)} attach="material" />
        </mesh>

        {/* Outer Composite Nacelle Cowl Shell */}
        <mesh position={[0, 0, -0.42]}>
          <cylinderGeometry args={[1.55, 1.44, 3.85, 48, 2, true]} />
          <primitive object={mat("FAN_CASING", "#94a3b8", 0.7, 0.32, true)} attach="material" />
        </mesh>

        {/* Internal Bypass Duct Liner & Acoustic Ring */}
        <mesh position={[0, 0, -0.22]}>
          <cylinderGeometry args={[1.45, 1.35, 3.2, 40, 1, true]} />
          <primitive object={mat("BYPASS_DUCT", "#64748b", 0.75, 0.35, true)} attach="material" />
        </mesh>

        {/* 20 Structural Cambered Outlet Guide Vanes (OGVs) */}
        {Array.from({ length: 20 }, (_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          return (
            <mesh
              key={`ogv-${i}`}
              geometry={ogvBladeGeometry}
              position={[Math.cos(angle) * 0.95, Math.sin(angle) * 0.95, -1.3]}
              rotation={[0, 0, angle + Math.PI / 2]}
            >
              <primitive object={mat("BYPASS_DUCT", "#94a3b8", 0.88, 0.22)} attach="material" />
            </mesh>
          );
        })}
      </group>

      {/* ========================================================================= */}
      {/* 2. N1 LOW-PRESSURE ROTATING SPOOL (FAN + LPC + LPT)                      */}
      {/* ========================================================================= */}
      <group ref={n1SpoolRef}>
        {/* ----- FAN ROTOR & SPINNER ASSEMBLY ----- */}
        <group position={[0, 0, -2.02 + offsets.fanZ]}>
          {/* Fan Hub Disk with Dovetail Slots */}
          <mesh rotation={[Math.PI / 2, 0, 0]} {...bind("FAN_BLADES")}>
            <cylinderGeometry args={[0.56, 0.54, 0.34, 36]} />
            <primitive object={mat("FAN_BLADES", "#cbd5e1", 0.92, 0.16)} attach="material" />
          </mesh>

          {/* Aerodynamic Spinner Cone with Spiral Striping */}
          <group position={[0, 0, -0.44]} {...bind("SPINNER_CONE")}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.54, 0.88, 36]} />
              <primitive object={mat("SPINNER_CONE", "#0f172a", 0.9, 0.12)} attach="material" />
            </mesh>
            {/* Nose Tip Cap */}
            <mesh position={[0, 0, -0.46]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <primitive object={mat("SPINNER_CONE", "#cbd5e1", 0.95, 0.1)} attach="material" />
            </mesh>
          </group>

          {/* 24 Wide-Chord Aerofoil Fan Blades with Root Platforms */}
          <group {...bind("FAN_BLADES")}>
            {Array.from({ length: 24 }, (_, i) => {
              const angle = (i / 24) * Math.PI * 2;
              return (
                <group key={`fan-blade-${i}`} rotation={[0, 0, angle]}>
                  {/* Blade Root Dovetail Platform */}
                  <mesh position={[0.52, 0, 0]} rotation={[0, 0, 0]}>
                    <boxGeometry args={[0.085, 0.055, 0.32]} />
                    <primitive object={mat("FAN_BLADES", "#94a3b8", 0.85, 0.25)} attach="material" />
                  </mesh>
                  {/* Curved Cambered Wide-Chord Titanium Aerofoil */}
                  <mesh
                    geometry={fanBladeGeometry}
                    position={[0.55, 0, -0.16]}
                    rotation={[0, 0, -Math.PI / 2]}
                  >
                    <primitive object={mat("FAN_BLADES", "#e2e8f0", 0.94, 0.15)} attach="material" />
                  </mesh>
                </group>
              );
            })}
          </group>
        </group>

        {/* ----- LOW-PRESSURE COMPRESSOR (3-STAGE BOOSTER) ----- */}
        <group position={[0, 0, -1.35 + offsets.lpcZ]} {...bind("LPC_BOOSTER")}>
          {[0, 0.22, 0.44].map((zOffset, stageIdx) => {
            const diskRadius = 0.44 - stageIdx * 0.02;
            const bladeLen = 0.28 - stageIdx * 0.025;
            return (
              <group key={`lpc-stage-${stageIdx}`} position={[0, 0, zOffset]}>
                {/* Forged Titanium Rotor Disk */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[diskRadius, diskRadius, 0.09, 32]} />
                  <primitive object={mat("LPC_BOOSTER", "#94a3b8", 0.88, 0.22)} attach="material" />
                </mesh>
                {/* 28 Staggered Booster Blades */}
                {Array.from({ length: 28 }, (_, bIdx) => {
                  const bAngle = (bIdx / 28) * Math.PI * 2;
                  return (
                    <mesh
                      key={`lpc-b-${bIdx}`}
                      position={[
                        Math.cos(bAngle) * (diskRadius + bladeLen * 0.48),
                        Math.sin(bAngle) * (diskRadius + bladeLen * 0.48),
                        0,
                      ]}
                      rotation={[0, 0, bAngle + 0.34]}
                    >
                      <boxGeometry args={[bladeLen, 0.022, 0.11]} />
                      <primitive object={mat("LPC_BOOSTER", "#cbd5e1", 0.9, 0.18)} attach="material" />
                    </mesh>
                  );
                })}
              </group>
            );
          })}
        </group>

        {/* ----- N1 CONCENTRIC DRIVE SHAFT ----- */}
        <group {...bind("SHAFT_N1")}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.078, 0.078, 4.45, 24]} />
            <primitive object={mat("SHAFT_N1", "#475569", 0.95, 0.15)} attach="material" />
          </mesh>
        </group>

        {/* ----- LOW-PRESSURE TURBINE (4-STAGE ROTOR ASSEMBLY) ----- */}
        <group position={[0, 0, 1.25 + offsets.lptZ]} {...bind("LPT_TURBINE")}>
          {[0, 0.18, 0.36, 0.54].map((zOffset, stageIdx) => {
            const diskR = 0.34 + stageIdx * 0.04;
            const bladeLen = 0.28 + stageIdx * 0.04;
            return (
              <group key={`lpt-stage-${stageIdx}`} position={[0, 0, zOffset]}>
                {/* Inconel 718 Turbine Disk */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[diskR, diskR, 0.08, 32]} />
                  <primitive object={mat("LPT_TURBINE", "#64748b", 0.9, 0.22)} attach="material" />
                </mesh>
                {/* 36 Shrouded Turbine Blades with Tip Interlocks */}
                {Array.from({ length: 36 }, (_, bIdx) => {
                  const bAngle = (bIdx / 36) * Math.PI * 2;
                  return (
                    <group key={`lpt-b-${bIdx}`}>
                      <mesh
                        position={[
                          Math.cos(bAngle) * (diskR + bladeLen * 0.5),
                          Math.sin(bAngle) * (diskR + bladeLen * 0.5),
                          0,
                        ]}
                        rotation={[0, 0, bAngle - 0.42]}
                      >
                        <boxGeometry args={[bladeLen, 0.02, 0.095]} />
                        <primitive object={mat("LPT_TURBINE", "#94a3b8", 0.9, 0.2)} attach="material" />
                      </mesh>
                      {/* Outer Tip Shroud Damper */}
                      <mesh
                        position={[
                          Math.cos(bAngle) * (diskR + bladeLen),
                          Math.sin(bAngle) * (diskR + bladeLen),
                          0,
                        ]}
                        rotation={[0, 0, bAngle]}
                      >
                        <boxGeometry args={[0.045, 0.015, 0.08]} />
                        <primitive object={mat("LPT_TURBINE", "#64748b", 0.85, 0.3)} attach="material" />
                      </mesh>
                    </group>
                  );
                })}
              </group>
            );
          })}
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 3. N2 HIGH-PRESSURE ROTATING SPOOL (HPC CORE + HPT)                      */}
      {/* ========================================================================= */}
      <group ref={n2SpoolRef}>
        {/* N2 Hollow Outer Shaft & Bearings */}
        <group {...bind("SHAFT_N2")}>
          <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.135, 0.135, 2.05, 24, 1, true]} />
            <primitive object={mat("SHAFT_N2", "#334155", 0.92, 0.18)} attach="material" />
          </mesh>
          {/* #2 Ball Thrust Bearing Housing */}
          <mesh position={[0, 0, -0.62]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.185, 0.04, 12, 28]} />
            <primitive object={mat("BEARING_COMPARTMENTS", "#64748b", 0.95, 0.15)} attach="material" />
          </mesh>
          {/* #3 Inter-Shaft Roller Bearing Housing */}
          <mesh position={[0, 0, 0.92]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.185, 0.04, 12, 28]} />
            <primitive object={mat("BEARING_COMPARTMENTS", "#64748b", 0.95, 0.15)} attach="material" />
          </mesh>
        </group>

        {/* ----- HIGH-PRESSURE COMPRESSOR (9-STAGE BLISKS) ----- */}
        <group position={[0, 0, -0.52 + offsets.hpcZ]} {...bind("HPC_CORE")}>
          {Array.from({ length: 9 }, (_, stageIdx) => {
            const zPos = (stageIdx / 8) * 0.96;
            // Realistic annular convergence: hub radius grows while tip radius tapers inward
            const hubRadius = 0.36 + stageIdx * 0.012;
            const tipRadius = 0.68 - stageIdx * 0.029;
            const bladeLen = tipRadius - hubRadius;
            const bCount = 32 + stageIdx * 2;

            return (
              <group key={`hpc-stage-${stageIdx}`} position={[0, 0, zPos]}>
                {/* Forged Integrally Bladed Disk (Blisk) Hub */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[hubRadius, hubRadius, 0.068, 32]} />
                  <primitive
                    object={mat(
                      "HPC_CORE",
                      stageIdx < 5 ? "#94a3b8" : "#78716c", // Ti for early stages, Inconel for late stages
                      0.88,
                      0.22
                    )}
                    attach="material"
                  />
                </mesh>
                {/* Precision Aerofoil Compressor Blades */}
                {Array.from({ length: bCount }, (_, bIdx) => {
                  const bAngle = (bIdx / bCount) * Math.PI * 2;
                  return (
                    <mesh
                      key={`hpc-b-${stageIdx}-${bIdx}`}
                      position={[
                        Math.cos(bAngle) * (hubRadius + bladeLen * 0.48),
                        Math.sin(bAngle) * (hubRadius + bladeLen * 0.48),
                        0,
                      ]}
                      rotation={[0, 0, bAngle + 0.36]}
                    >
                      <boxGeometry args={[bladeLen, 0.016, 0.068]} />
                      <primitive
                        object={mat("HPC_CORE", stageIdx < 5 ? "#cbd5e1" : "#a8a29e", 0.92, 0.16)}
                        attach="material"
                      />
                    </mesh>
                  );
                })}
              </group>
            );
          })}
        </group>

        {/* ----- HIGH-PRESSURE TURBINE (2 STAGES, SINGLE CRYSTAL) ----- */}
        <group position={[0, 0, 0.82 + offsets.hptZ]} {...bind("HPT_STAGE_1")}>
          {[0, 0.16].map((zOffset, stageIdx) => (
            <group key={`hpt-stage-${stageIdx}`} position={[0, 0, zOffset]}>
              {/* Forged Inconel Disk with Fir-Tree Slots */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.29, 0.29, 0.085, 32]} />
                <primitive object={mat("HPT_STAGE_1", "#475569", 0.9, 0.2)} attach="material" />
              </mesh>
              {/* 38 Single-Crystal CMSX-4 Superalloy Turbine Blades */}
              {Array.from({ length: 38 }, (_, bIdx) => {
                const bAngle = (bIdx / 38) * Math.PI * 2;
                return (
                  <group key={`hpt-b-${bIdx}`}>
                    {/* Fir-Tree Root Platform */}
                    <mesh
                      position={[Math.cos(bAngle) * 0.31, Math.sin(bAngle) * 0.31, 0]}
                      rotation={[0, 0, bAngle]}
                    >
                      <boxGeometry args={[0.04, 0.03, 0.08]} />
                      <primitive object={mat("HPT_STAGE_1", "#334155", 0.85, 0.25)} attach="material" />
                    </mesh>
                    {/* Air-Cooled Superalloy Blade with Thermal Barrier Coating */}
                    <mesh
                      position={[Math.cos(bAngle) * 0.45, Math.sin(bAngle) * 0.45, 0]}
                      rotation={[0, 0, bAngle - 0.46]}
                    >
                      <boxGeometry args={[0.26, 0.024, 0.085]} />
                      <primitive object={mat("HPT_STAGE_1", "#64748b", 0.92, 0.16)} attach="material" />
                    </mesh>
                  </group>
                );
              })}
            </group>
          ))}
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 4. STATIONARY CORE CASING & VARIABLE STATOR VANES                         */}
      {/* ========================================================================= */}
      <group position={[0, 0, -0.06 + offsets.hpcZ]} {...bind("HPC_CASING")}>
        {/* Split Compressor Casing */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.73, 0.52, 1.18, 36, 1, true]} />
          <primitive object={mat("HPC_CASING", "#475569", 0.75, 0.35, true)} attach="material" />
        </mesh>
        {/* External Variable Stator Vane (VSV) Actuation Torque Rings */}
        {[-0.35, -0.15, 0.05].map((ringZ, i) => (
          <mesh key={`vsv-ring-${i}`} position={[0, 0, ringZ]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.72 - i * 0.06, 0.015, 8, 36]} />
            <primitive object={mat("HPC_CASING", "#cbd5e1", 0.9, 0.2)} attach="material" />
          </mesh>
        ))}
      </group>

      {/* ========================================================================= */}
      {/* 5. ANNULAR COMBUSTOR SECTION                                             */}
      {/* ========================================================================= */}
      <group position={[0, 0, 0.58 + offsets.combustorZ]} {...bind("COMBUSTOR_ANNULAR")}>
        {/* Perforated Outer Effusion Cooling Liner */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.55, 0.49, 0.48, 36, 1, true]} />
          <primitive object={mat("COMBUSTOR_ANNULAR", "#b45309", 0.72, 0.38, true)} attach="material" />
        </mesh>

        {/* Perforated Inner Liner */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.29, 0.27, 0.46, 36, 1, true]} />
          <primitive object={mat("COMBUSTOR_ANNULAR", "#78350f", 0.75, 0.35, true)} attach="material" />
        </mesh>

        {/* 18 Dual-Orifice Fuel Spray Nozzles with Aerodynamic Swirlers */}
        <group {...bind("FUEL_INJECTORS")}>
          {Array.from({ length: 18 }, (_, i) => {
            const angle = (i / 18) * Math.PI * 2;
            return (
              <group
                key={`injector-${i}`}
                position={[Math.cos(angle) * 0.42, Math.sin(angle) * 0.42, -0.23]}
                rotation={[0, 0, angle]}
              >
                {/* Nozzle Body */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.024, 0.032, 0.085, 12]} />
                  <primitive object={mat("FUEL_INJECTORS", "#d97706", 0.85, 0.2)} attach="material" />
                </mesh>
                {/* Axial Air Swirler Cup */}
                <mesh position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.035, 0.009, 8, 16]} />
                  <primitive object={mat("FUEL_INJECTORS", "#f59e0b", 0.9, 0.15)} attach="material" />
                </mesh>
              </group>
            );
          })}

          {/* High-Pressure Fuel Manifold Ring */}
          <mesh position={[0, 0, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.43, 0.016, 12, 36]} />
            <primitive object={mat("FUEL_INJECTORS", "#cbd5e1", 0.95, 0.15)} attach="material" />
          </mesh>
        </group>

        {/* Thermal Combustion Flame Zone Emission */}
        {mode !== "wireframe" && (
          <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.46, 0.42, 0.3, 24, 1, true]} />
            <meshStandardMaterial
              color="#f97316"
              emissive="#ea580c"
              emissiveIntensity={2.1}
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
              clippingPlanes={cutawayPlanes}
            />
          </mesh>
        )}
      </group>

      {/* ========================================================================= */}
      {/* 6. EXHAUST SECTION (MIXER NOZZLE & CENTER PLUG)                         */}
      {/* ========================================================================= */}
      <group position={[0, 0, 1.82 + offsets.exhaustZ]}>
        {/* Core Convergent Exhaust Nozzle */}
        <mesh position={[0, 0, 0.22]} rotation={[-Math.PI / 2, 0, 0]} {...bind("EXHAUST_NOZZLE")}>
          <cylinderGeometry args={[0.62, 0.48, 0.78, 36, 1, true]} />
          <primitive object={mat("EXHAUST_NOZZLE", "#475569", 0.8, 0.32, true)} attach="material" />
        </mesh>

        {/* Aerodynamic Center Exhaust Tail Plug (Cone) */}
        <mesh position={[0, 0, 0.38]} rotation={[-Math.PI / 2, 0, 0]} {...bind("EXHAUST_CONE")}>
          <coneGeometry args={[0.33, 1.2, 32]} />
          <primitive object={mat("EXHAUST_CONE", "#334155", 0.88, 0.24)} attach="material" />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 7. ACCESSORY GEARBOX & DRIVES (6 O'CLOCK FAN CASE MOUNT)                 */}
      {/* ========================================================================= */}
      <group position={[0, -1.38 + offsets.gearboxY, -0.82]} {...bind("ACCESSORY_GEARBOX")}>
        {/* Cast Magnesium/Aluminum Gearbox Casing */}
        <mesh>
          <boxGeometry args={[0.78, 0.38, 0.88]} />
          <primitive object={mat("ACCESSORY_GEARBOX", "#475569", 0.75, 0.38)} attach="material" />
        </mesh>
        {/* Radial Bevel Drive Tower Shaft */}
        <mesh position={[0, 0.48, 0.1]} rotation={[0.25, 0, 0]}>
          <cylinderGeometry args={[0.046, 0.046, 0.74, 16]} />
          <primitive object={mat("ACCESSORY_GEARBOX", "#94a3b8", 0.92, 0.18)} attach="material" />
        </mesh>
        {/* Lubrication Scavenge Oil Filter Housing */}
        <mesh position={[0.28, 0.05, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.095, 0.095, 0.29, 16]} />
          <primitive object={mat("ACCESSORY_GEARBOX", "#64748b", 0.85, 0.25)} attach="material" />
        </mesh>
        {/* Fuel Metering Unit (FMU) Pump */}
        <mesh position={[-0.28, -0.05, -0.16]}>
          <cylinderGeometry args={[0.115, 0.115, 0.26, 16]} />
          <primitive object={mat("ACCESSORY_GEARBOX", "#334155", 0.82, 0.28)} attach="material" />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 8. SENSOR BEACONS & LIVE HUD FLOATING BADGES                              */}
      {/* ========================================================================= */}
      {mode === "sensor" &&
        sensorLocations.map((s) => {
          const isSelected = selectedSensor === s.key;
          const info = latestSensors[s.key];
          const isFlagged = info?.flag;

          return (
            <group
              key={s.key}
              position={s.pos}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSensor?.(s.key);
              }}
            >
              {/* 3D Pulsing Beacon Sphere */}
              <mesh>
                <sphereGeometry args={[0.055, 16, 16]} />
                <meshStandardMaterial
                  color={isFlagged ? "#ef4444" : isSelected ? "#38bdf8" : "#22c55e"}
                  emissive={isFlagged ? "#dc2626" : isSelected ? "#0284c7" : "#16a34a"}
                  emissiveIntensity={1.5}
                />
              </mesh>

              {/* Pulsing Outer Orbit Ring */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.11, 0.012, 8, 24]} />
                <meshBasicMaterial
                  color={isFlagged ? "#ef4444" : isSelected ? "#38bdf8" : "#22c55e"}
                  transparent
                  opacity={0.85}
                />
              </mesh>

              {/* Live HUD Station Tag */}
              <Html distanceFactor={8} position={[0, 0.2, 0]} center>
                <div
                  style={{
                    background: isFlagged ? "rgba(185, 28, 28, 0.92)" : "rgba(15, 23, 42, 0.9)",
                    border: `1px solid ${isFlagged ? "#f87171" : isSelected ? "#38bdf8" : "#334155"}`,
                    color: "#f8fafc",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
                  }}
                >
                  <span>{s.label}</span>
                  {info && (
                    <span style={{ marginLeft: "6px", color: isFlagged ? "#fca5a5" : "#7dd3fc" }}>
                      {info.value} {info.unit}
                    </span>
                  )}
                </div>
              </Html>
            </group>
          );
        })}
    </group>
  );
}

