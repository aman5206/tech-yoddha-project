"use client";
import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { SENSOR_DEFINITIONS, SensorInfo } from "../lib/dataService";

export type VisualizationMode =
  | "standard"
  | "cutaway"
  | "exploded"
  | "xray"
  | "wireframe"
  | "thermal"
  | "health"
  | "sensor";

export interface TurbofanProps {
  mode: VisualizationMode;
  speed: number;
  explodedAmount?: number;
  cutawayAngle?: number;
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

// Custom Airflow Stream Particles
function AirflowParticles({ speed, coreTemp }: { speed: number; coreTemp: number }) {
  const count = 180;
  const bypassPoints = useRef<THREE.Points>(null);
  const corePoints = useRef<THREE.Points>(null);

  const [bypassPos, bypassSpeeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const radius = 1.05 + Math.random() * 0.45;
      const z = (Math.random() - 0.5) * 4.6;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius;
      pos[i * 3 + 2] = z;
      spd[i] = 1.8 + Math.random() * 1.4;
    }
    return [pos, spd];
  }, []);

  const [corePos, coreSpeeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const z = -2.2 + (i / count) * 4.4;
      // Core gas path narrows from fan to combustor, then expands
      let radius = 0.55;
      if (z < -0.8) radius = 0.55 - (z + 2.2) * 0.15; // LPC
      else if (z < 0.6) radius = 0.35 - (z + 0.8) * 0.08; // HPC
      else if (z < 1.4) radius = 0.32; // Combustor
      else radius = 0.35 + (z - 1.4) * 0.12; // Turbines & Exhaust

      const angle = Math.random() * Math.PI * 2;
      const r = (radius * (0.3 + Math.random() * 0.7));
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = Math.sin(angle) * r;
      pos[i * 3 + 2] = z;
      spd[i] = 2.2 + Math.random() * 2.0;
    }
    return [pos, spd];
  }, []);

  useFrame((_, delta) => {
    if (speed <= 0) return;
    const dt = Math.min(delta, 0.1) * speed;

    if (bypassPoints.current) {
      const pos = bypassPoints.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 2] += bypassSpeeds[i] * dt;
        if (pos[i * 3 + 2] > 2.4) pos[i * 3 + 2] = -2.4;
      }
      bypassPoints.current.geometry.attributes.position.needsUpdate = true;
    }

    if (corePoints.current) {
      const pos = corePoints.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 2] += coreSpeeds[i] * dt;
        if (pos[i * 3 + 2] > 2.2) pos[i * 3 + 2] = -2.2;
      }
      corePoints.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Bypass Flow (Cool Cyan/Electric Blue) */}
      <points ref={bypassPoints}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={bypassPos}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#38bdf8"
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Core Gas Path Flow (Thermal Gradient) */}
      <points ref={corePoints}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={corePos}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.07}
          color={coreTemp > 0.6 ? "#fb923c" : "#60a5fa"}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export function TurbofanModel({
  mode,
  speed,
  explodedAmount = 0,
  cutawayAngle = Math.PI / 2,
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
}: TurbofanProps) {
  const n1Spool = useRef<THREE.Group>(null);
  const n2Spool = useRef<THREE.Group>(null);
  const engineGroup = useRef<THREE.Group>(null);

  // Dynamic Spool Rotation (N1 Fan/LPC/LPT vs N2 HPC/HPT differential speed)
  useFrame((_, delta) => {
    if (reducedMotion || speed === 0) return;
    const dt = Math.min(delta, 0.1) * speed;
    if (n1Spool.current) {
      n1Spool.current.rotation.z += dt * 3.8; // N1 Fan spool rotation
    }
    if (n2Spool.current) {
      n2Spool.current.rotation.z += dt * 6.4; // N2 Core spool rotates faster
    }
  });

  // Cutaway clipping planes
  const cutawayPlane = useMemo(() => {
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }, []);

  const clippingPlanes = mode === "cutaway" ? [cutawayPlane] : [];

  // Material Generator based on mode and component state
  const getMaterial = (
    compId: string,
    defaultColor: string,
    metalness = 0.8,
    roughness = 0.35,
    thermalColor = "#60a5fa",
    isCasing = false
  ) => {
    const isSelected = selectedComponent === compId;
    const isHovered = hoveredComponent === compId;
    const health = componentHealth[compId] ?? 88;

    // Health color
    let healthColor = "#22c55e"; // Green (>80)
    if (health < 50) healthColor = "#ef4444"; // Red Critical
    else if (health < 80) healthColor = "#f59e0b"; // Amber Warning

    // Wireframe mode
    if (mode === "wireframe") {
      return (
        <meshBasicMaterial
          color={isSelected ? "#38bdf8" : isHovered ? "#67e8f9" : "#475569"}
          wireframe
          clippingPlanes={clippingPlanes}
        />
      );
    }

    // X-Ray mode
    if (mode === "xray") {
      if (isCasing) {
        return (
          <meshPhysicalMaterial
            color="#38bdf8"
            transparent
            opacity={0.18}
            roughness={0.1}
            transmission={0.85}
            thickness={0.5}
            clippingPlanes={clippingPlanes}
          />
        );
      }
      return (
        <meshStandardMaterial
          color={isSelected ? "#38bdf8" : isHovered ? "#93c5fd" : defaultColor}
          emissive={isSelected ? "#0284c7" : isHovered ? "#0369a1" : "#0f172a"}
          emissiveIntensity={isSelected ? 0.8 : 0.3}
          metalness={0.9}
          roughness={0.2}
          clippingPlanes={clippingPlanes}
        />
      );
    }

    // Thermal IR Mode
    if (mode === "thermal") {
      return (
        <meshStandardMaterial
          color={thermalColor}
          emissive={thermalColor}
          emissiveIntensity={isSelected ? 0.8 : 0.45}
          roughness={0.4}
          metalness={0.5}
          clippingPlanes={clippingPlanes}
        />
      );
    }

    // Health Mode
    if (mode === "health") {
      return (
        <meshStandardMaterial
          color={healthColor}
          emissive={healthColor}
          emissiveIntensity={isSelected ? 0.7 : isHovered ? 0.5 : 0.25}
          metalness={0.6}
          roughness={0.3}
          clippingPlanes={clippingPlanes}
        />
      );
    }

    // Standard PBR Mode with Selection / Hover highlights
    if (isCasing && mode === "cutaway") {
      return (
        <meshStandardMaterial
          color={isSelected ? "#38bdf8" : defaultColor}
          metalness={metalness}
          roughness={roughness}
          side={THREE.DoubleSide}
          clippingPlanes={clippingPlanes}
        />
      );
    }

    return (
      <meshStandardMaterial
        color={isSelected ? "#38bdf8" : isHovered ? "#7dd3fc" : defaultColor}
        emissive={isSelected ? "#0284c7" : isHovered ? "#0369a1" : "#000000"}
        emissiveIntensity={isSelected ? 0.6 : isHovered ? 0.3 : 0}
        metalness={metalness}
        roughness={roughness}
        side={isCasing ? THREE.DoubleSide : THREE.FrontSide}
        clippingPlanes={clippingPlanes}
      />
    );
  };

  // Event handler for component clicking & hovering
  const handleComp = (id: string) => ({
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

  // Calculate exploded offsets along longitudinal Z-axis
  const expl = mode === "exploded" ? (explodedAmount || 1.0) : 0;
  const fanZ = -expl * 1.6;
  const lpcZ = -expl * 0.9;
  const hpcZ = -expl * 0.3;
  const ccZ = expl * 0.3;
  const hptZ = expl * 0.8;
  const lptZ = expl * 1.4;
  const exhZ = expl * 2.2;
  const nacelleX = expl * 0.9;

  // Sensor hotspots coordinate mappings
  const sensorHotspots = [
    { key: "s2", label: "T24 (Station 2.4)", pos: [0, 0.72, -1.2 + lpcZ] as [number, number, number], comp: "LPC" },
    { key: "s3", label: "T30 (Station 3.0)", pos: [0, 0.52, 0.1 + hpcZ] as [number, number, number], comp: "HPC" },
    { key: "s7", label: "P30 (Station 3.0)", pos: [0.48, 0, 0.1 + hpcZ] as [number, number, number], comp: "HPC" },
    { key: "s11", label: "Ps30 (Station 3.0)", pos: [-0.48, 0, 0.1 + hpcZ] as [number, number, number], comp: "HPC" },
    { key: "s4", label: "T50 (Station 5.0)", pos: [0, 0.62, 1.4 + lptZ] as [number, number, number], comp: "LPT" },
    { key: "s8", label: "Nf Speed (Spool)", pos: [0, 0.32, -1.8 + fanZ] as [number, number, number], comp: "Fan" },
    { key: "s9", label: "Nc Speed (Core)", pos: [0, 0.28, -0.2 + hpcZ] as [number, number, number], comp: "HPC" },
    { key: "s20", label: "W31 Bleed", pos: [0.38, 0.32, 0.7 + hptZ] as [number, number, number], comp: "HPT" },
    { key: "s21", label: "W32 Bleed", pos: [-0.38, 0.32, 1.2 + lptZ] as [number, number, number], comp: "LPT" },
  ];

  return (
    <group ref={engineGroup} dispose={null}>
      {/* ==================== AIRFLOW STREAMLINES ==================== */}
      {showAirflow && mode !== "wireframe" && (
        <AirflowParticles speed={speed} coreTemp={mode === "thermal" ? 1.0 : 0.4} />
      )}

      {/* ==================== 1. NACELLE & BYPASS DUCT ==================== */}
      <group position={[nacelleX, 0, 0]} {...handleComp("Nacelle")}>
        {/* Outer Nacelle Cowling */}
        <mesh position={[0, 0, -0.4]}>
          <cylinderGeometry args={[1.52, 1.42, 3.8, 48, 2, true]} />
          {getMaterial("Nacelle", "#94a3b8", 0.6, 0.3, "#38bdf8", true)}
        </mesh>

        {/* Aerodynamic Intake Lip (Polished Titanium Ring) */}
        <mesh position={[0, 0, -2.3]}>
          <torusGeometry args={[1.5, 0.08, 16, 48]} />
          {getMaterial("Nacelle", "#cbd5e1", 0.85, 0.15, "#0284c7")}
        </mesh>

        {/* Internal Bypass Duct Shell */}
        <mesh position={[0, 0, -0.2]}>
          <cylinderGeometry args={[1.44, 1.34, 3.2, 36, 1, true]} />
          {getMaterial("Nacelle", "#64748b", 0.7, 0.4, "#0ea5e9", true)}
        </mesh>

        {/* Structural Outlet Guide Vanes (OGVs in Bypass Duct) */}
        {Array.from({ length: 18 }, (_, i) => {
          const angle = (i / 18) * Math.PI * 2;
          return (
            <mesh
              key={`ogv-${i}`}
              position={[Math.cos(angle) * 1.15, Math.sin(angle) * 1.15, -1.3]}
              rotation={[0, 0, angle + Math.PI / 2]}
            >
              <boxGeometry args={[0.55, 0.025, 0.22]} />
              {getMaterial("Nacelle", "#64748b", 0.8, 0.3, "#38bdf8")}
            </mesh>
          );
        })}
      </group>

      {/* ==================== 2. N1 LOW-PRESSURE SPOOL (FAN + LPC + LPT) ==================== */}
      <group ref={n1Spool}>
        {/* ----- FAN ASSEMBLY ----- */}
        <group position={[0, 0, -2.0 + fanZ]} {...handleComp("Fan")}>
          {/* Fan Hub Disk */}
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.55, 0.52, 0.32, 32]} />
            {getMaterial("Fan", "#cbd5e1", 0.88, 0.2, "#38bdf8")}
          </mesh>

          {/* Aerodynamic Spinner Cone with Spiral Nose */}
          <mesh position={[0, 0, -0.42]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.52, 0.85, 32]} />
            {getMaterial("Fan", "#0f172a", 0.9, 0.1, "#0284c7")}
          </mesh>

          {/* 24 Curved Wide-Chord Titanium Fan Blades */}
          {Array.from({ length: 24 }, (_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            return (
              <group key={`blade-${i}`} rotation={[0, 0, angle]}>
                <mesh
                  position={[0.96, 0, 0]}
                  rotation={[0.38, 0.12, 0]}
                >
                  {/* Tapered curved aerodynamic fan blade */}
                  <boxGeometry args={[0.92, 0.038, 0.34]} />
                  {getMaterial("Fan", "#e2e8f0", 0.92, 0.18, "#38bdf8")}
                </mesh>
                {/* Blade Root Platform */}
                <mesh position={[0.52, 0, 0]}>
                  <boxGeometry args={[0.08, 0.06, 0.28]} />
                  {getMaterial("Fan", "#94a3b8", 0.85, 0.25, "#0284c7")}
                </mesh>
              </group>
            );
          })}
        </group>

        {/* ----- LPC (BOOSTER COMPRESSOR) ROTOR STAGES ----- */}
        <group position={[0, 0, -1.3 + lpcZ]} {...handleComp("LPC")}>
          {[0, 0.22, 0.44].map((offsetZ, stageIdx) => (
            <group key={`lpc-stage-${stageIdx}`} position={[0, 0, offsetZ]}>
              {/* Rotor Disk */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.42 - stageIdx * 0.02, 0.42 - stageIdx * 0.02, 0.09, 32]} />
                {getMaterial("LPC", "#94a3b8", 0.85, 0.25, "#38bdf8")}
              </mesh>
              {/* Blades Ring */}
              {Array.from({ length: 28 }, (_, bIdx) => {
                const bAngle = (bIdx / 28) * Math.PI * 2;
                return (
                  <mesh
                    key={`lpc-b-${stageIdx}-${bIdx}`}
                    position={[
                      Math.cos(bAngle) * (0.58 - stageIdx * 0.03),
                      Math.sin(bAngle) * (0.58 - stageIdx * 0.03),
                      0,
                    ]}
                    rotation={[0, 0, bAngle + 0.3]}
                  >
                    <boxGeometry args={[0.32 - stageIdx * 0.02, 0.025, 0.12]} />
                    {getMaterial("LPC", "#cbd5e1", 0.88, 0.2, "#60a5fa")}
                  </mesh>
                );
              })}
            </group>
          ))}
        </group>

        {/* ----- INNER N1 LOW-PRESSURE SHAFT ----- */}
        <group {...handleComp("Shaft")}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 4.4, 24]} />
            {getMaterial("Shaft", "#475569", 0.95, 0.15, "#93c5fd")}
          </mesh>
        </group>

        {/* ----- LPT (LOW-PRESSURE TURBINE) ROTOR STAGES ----- */}
        <group position={[0, 0, 1.25 + lptZ]} {...handleComp("LPT")}>
          {[0, 0.18, 0.36, 0.54].map((offsetZ, stageIdx) => (
            <group key={`lpt-stage-${stageIdx}`} position={[0, 0, offsetZ]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.32 + stageIdx * 0.04, 0.32 + stageIdx * 0.04, 0.08, 32]} />
                {getMaterial("LPT", "#64748b", 0.9, 0.22, "#fb923c")}
              </mesh>
              {/* LPT Blades (34 per stage) */}
              {Array.from({ length: 34 }, (_, bIdx) => {
                const bAngle = (bIdx / 34) * Math.PI * 2;
                return (
                  <mesh
                    key={`lpt-b-${stageIdx}-${bIdx}`}
                    position={[
                      Math.cos(bAngle) * (0.48 + stageIdx * 0.05),
                      Math.sin(bAngle) * (0.48 + stageIdx * 0.05),
                      0,
                    ]}
                    rotation={[0, 0, bAngle - 0.4]}
                  >
                    <boxGeometry args={[0.28 + stageIdx * 0.03, 0.02, 0.1]} />
                    {getMaterial("LPT", "#94a3b8", 0.9, 0.2, "#f97316")}
                  </mesh>
                );
              })}
            </group>
          ))}
        </group>
      </group>

      {/* ==================== 3. N2 HIGH-PRESSURE SPOOL (HPC + HPT) ==================== */}
      <group ref={n2Spool}>
        {/* Outer Hollow N2 Shaft */}
        <group {...handleComp("Shaft")}>
          <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 2.0, 24, 1, true]} />
            {getMaterial("Shaft", "#334155", 0.9, 0.2, "#cbd5e1")}
          </mesh>
          {/* Bearings Housings (#2 and #3) */}
          <mesh position={[0, 0, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.04, 12, 24]} />
            {getMaterial("Shaft", "#64748b", 0.95, 0.15, "#94a3b8")}
          </mesh>
          <mesh position={[0, 0, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.04, 12, 24]} />
            {getMaterial("Shaft", "#64748b", 0.95, 0.15, "#94a3b8")}
          </mesh>
        </group>

        {/* ----- HPC (HIGH-PRESSURE COMPRESSOR, 9 STAGES) ----- */}
        <group position={[0, 0, -0.5 + hpcZ]} {...handleComp("HPC")}>
          {Array.from({ length: 9 }, (_, stageIdx) => {
            const zPos = (stageIdx / 8) * 0.95;
            // HPC blisks taper down along gas path as air is compressed
            const hubR = 0.36 + stageIdx * 0.01;
            const tipR = 0.68 - stageIdx * 0.028;
            const bladeLen = tipR - hubR;

            return (
              <group key={`hpc-stage-${stageIdx}`} position={[0, 0, zPos]}>
                {/* Rotor Blisk Hub */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[hubR, hubR, 0.065, 32]} />
                  {getMaterial("HPC", "#94a3b8", 0.88, 0.25, "#fbbf24")}
                </mesh>
                {/* Blisk Rotor Blades */}
                {Array.from({ length: 30 + stageIdx * 2 }, (_, bIdx) => {
                  const bCount = 30 + stageIdx * 2;
                  const bAngle = (bIdx / bCount) * Math.PI * 2;
                  return (
                    <mesh
                      key={`hpc-b-${stageIdx}-${bIdx}`}
                      position={[
                        Math.cos(bAngle) * (hubR + bladeLen * 0.5),
                        Math.sin(bAngle) * (hubR + bladeLen * 0.5),
                        0,
                      ]}
                      rotation={[0, 0, bAngle + 0.35]}
                    >
                      <boxGeometry args={[bladeLen, 0.018, 0.07]} />
                      {getMaterial("HPC", "#cbd5e1", 0.92, 0.18, "#f59e0b")}
                    </mesh>
                  );
                })}
              </group>
            );
          })}
        </group>

        {/* ----- HPT (HIGH-PRESSURE TURBINE, 2 STAGES) ----- */}
        <group position={[0, 0, 0.82 + hptZ]} {...handleComp("HPT")}>
          {[0, 0.16].map((offsetZ, stageIdx) => (
            <group key={`hpt-stage-${stageIdx}`} position={[0, 0, offsetZ]}>
              {/* Single-Crystal Turbine Disk */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.28, 0.28, 0.09, 32]} />
                {getMaterial("HPT", "#475569", 0.9, 0.2, "#ef4444")}
              </mesh>
              {/* Superalloy Blades with Cooling Holes */}
              {Array.from({ length: 36 }, (_, bIdx) => {
                const bAngle = (bIdx / 36) * Math.PI * 2;
                return (
                  <mesh
                    key={`hpt-b-${stageIdx}-${bIdx}`}
                    position={[
                      Math.cos(bAngle) * 0.44,
                      Math.sin(bAngle) * 0.44,
                      0,
                    ]}
                    rotation={[0, 0, bAngle - 0.45]}
                  >
                    <boxGeometry args={[0.26, 0.024, 0.09]} />
                    {getMaterial("HPT", "#64748b", 0.92, 0.18, "#dc2626")}
                  </mesh>
                );
              })}
            </group>
          ))}
        </group>
      </group>

      {/* ==================== 4. STATIONARY CORE CASINGS & STATORS ==================== */}
      {/* HPC Outer Casing */}
      <group position={[0, 0, -0.05 + hpcZ]} {...handleComp("HPC")}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.72, 0.52, 1.15, 36, 1, true]} />
          {getMaterial("HPC", "#475569", 0.75, 0.35, "#f59e0b", true)}
        </mesh>
      </group>

      {/* ==================== 5. COMBUSTION SECTION ==================== */}
      <group position={[0, 0, 0.58 + ccZ]} {...handleComp("Combustor")}>
        {/* Annular Combustor Outer Liner */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.54, 0.48, 0.46, 32, 1, true]} />
          {getMaterial("Combustor", "#b45309", 0.7, 0.4, "#ea580c", true)}
        </mesh>

        {/* Annular Combustor Inner Liner */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.26, 0.44, 32, 1, true]} />
          {getMaterial("Combustor", "#78350f", 0.75, 0.35, "#c2410c", true)}
        </mesh>

        {/* 18 Dual-Orifice Fuel Injector Nozzles */}
        {Array.from({ length: 18 }, (_, i) => {
          const angle = (i / 18) * Math.PI * 2;
          return (
            <group
              key={`injector-${i}`}
              position={[Math.cos(angle) * 0.41, Math.sin(angle) * 0.41, -0.22]}
              rotation={[0, 0, angle]}
            >
              {/* Injector Nozzle Body */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.022, 0.03, 0.08, 12]} />
                {getMaterial("Combustor", "#d97706", 0.85, 0.2, "#f97316")}
              </mesh>
              {/* Swirler Flange */}
              <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.032, 0.008, 8, 16]} />
                {getMaterial("Combustor", "#f59e0b", 0.9, 0.15, "#fbbf24")}
              </mesh>
            </group>
          );
        })}

        {/* High-Pressure Fuel Manifold Ring */}
        <mesh position={[0, 0, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.015, 12, 36]} />
          {getMaterial("Combustor", "#cbd5e1", 0.95, 0.15, "#fbbf24")}
        </mesh>

        {/* Flame Zone Volumetric Glow (Thermal Emission) */}
        {mode !== "wireframe" && (
          <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.45, 0.42, 0.28, 24, 1, true]} />
            <meshStandardMaterial
              color="#f97316"
              emissive="#ea580c"
              emissiveIntensity={1.8}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>
        )}
      </group>

      {/* ==================== 6. REAR EXHAUST SECTION ==================== */}
      <group position={[0, 0, 1.8 + exhZ]} {...handleComp("Exhaust")}>
        {/* Core Convergent Exhaust Nozzle */}
        <mesh position={[0, 0, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.62, 0.48, 0.75, 36, 1, true]} />
          {getMaterial("Exhaust", "#475569", 0.8, 0.35, "#f97316", true)}
        </mesh>

        {/* Aerodynamic Center Exhaust Cone (Tail Cone Plug) */}
        <mesh position={[0, 0, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.32, 1.15, 32]} />
          {getMaterial("Exhaust", "#334155", 0.85, 0.25, "#ea580c")}
        </mesh>
      </group>

      {/* ==================== 7. ACCESSORY GEARBOX & DRIVES ==================== */}
      <group position={[0, -1.35, -0.8]} {...handleComp("Gearbox")}>
        {/* Gearbox Housing */}
        <mesh>
          <boxGeometry args={[0.75, 0.38, 0.85]} />
          {getMaterial("Gearbox", "#475569", 0.7, 0.4, "#38bdf8")}
        </mesh>
        {/* Radial Drive Tower Shaft */}
        <mesh position={[0, 0.48, 0.1]} rotation={[0.25, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.72, 16]} />
          {getMaterial("Gearbox", "#94a3b8", 0.9, 0.2, "#0284c7")}
        </mesh>
        {/* Lubrication Scavenge Oil Filter Housing */}
        <mesh position={[0.26, 0.05, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.28, 16]} />
          {getMaterial("Gearbox", "#64748b", 0.85, 0.25, "#38bdf8")}
        </mesh>
        {/* Fuel Metering Unit / High-Pressure Fuel Pump */}
        <mesh position={[-0.26, -0.05, -0.15]}>
          <cylinderGeometry args={[0.11, 0.11, 0.25, 16]} />
          {getMaterial("Gearbox", "#334155", 0.8, 0.3, "#0284c7")}
        </mesh>
      </group>

      {/* ==================== 8. INTERACTIVE SENSOR HOTSPOTS ==================== */}
      {mode === "sensor" &&
        sensorHotspots.map((s) => {
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
                  emissiveIntensity={1.4}
                />
              </mesh>

              {/* Pulsing Outer Beacon Ring */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.11, 0.012, 8, 24]} />
                <meshBasicMaterial
                  color={isFlagged ? "#ef4444" : isSelected ? "#38bdf8" : "#22c55e"}
                  transparent
                  opacity={0.8}
                />
              </mesh>

              {/* Live HUD Floating Badge */}
              <Html distanceFactor={8} position={[0, 0.2, 0]} center>
                <div
                  style={{
                    background: isFlagged ? "rgba(185, 28, 28, 0.9)" : "rgba(15, 23, 42, 0.88)",
                    border: `1px solid ${isFlagged ? "#f87171" : isSelected ? "#38bdf8" : "#334155"}`,
                    color: "#f8fafc",
                    padding: "3px 7px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    pointerEvents: "auto",
                  }}
                >
                  <span>{s.label}</span>
                  {info && (
                    <span style={{ marginLeft: "5px", color: isFlagged ? "#fca5a5" : "#7dd3fc" }}>
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

