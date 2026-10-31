"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";

interface Props { speed: number; cutaway: boolean; color: string; onHover: (n: string | null) => void }

function Engine({ speed, cutaway, color, onHover }: Props) {
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (rotor.current) rotor.current.rotation.y += speed * dt; });
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), []);
  const blades = useMemo(() => Array.from({ length: 22 }, (_, i) => (i / 22) * Math.PI * 2), []);
  const h = (n: string) => ({ onPointerOver: (e: { stopPropagation: () => void }) => { e.stopPropagation(); onHover(n); }, onPointerOut: () => onHover(null) });
  const steel = <meshStandardMaterial color="#8fa5b8" metalness={0.7} roughness={0.35} />;
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh {...h("Nacelle")}><cylinderGeometry args={[1.5, 1.25, 4.2, 48, 1, true]} />
        <meshStandardMaterial color="#b4c3d1" metalness={0.5} roughness={0.4} side={THREE.DoubleSide} clippingPlanes={cutaway ? [plane] : []} /></mesh>
      <group ref={rotor}>
        <group {...h("Fan")}>
          <mesh position={[0, 1.7, 0]}><coneGeometry args={[0.28, 0.5, 24]} />{steel}</mesh>
          {blades.map((a, i) => (
            <group key={i} rotation={[0, a, 0]}><mesh position={[0.8, 1.55, 0]} rotation={[0.35, 0, 0]}><boxGeometry args={[1.05, 0.04, 0.28]} />{steel}</mesh></group>))}
        </group>
        <mesh {...h("Shaft")}><cylinderGeometry args={[0.1, 0.1, 4, 16]} /><meshStandardMaterial color="#5c6f80" metalness={0.8} roughness={0.3} /></mesh>
        {[0.9, 0.6, 0.3, 0].map((y, i) => (
          <mesh key={y} position={[0, y, 0]} {...h("Compressor")}><cylinderGeometry args={[0.85 - i * 0.07, 0.85 - i * 0.07, 0.1, 32]} />{steel}</mesh>))}
        {[-0.95, -1.25, -1.55].map((y, i) => (
          <mesh key={y} position={[0, y, 0]} {...h("Turbine")}><cylinderGeometry args={[0.55 - i * 0.03, 0.55 - i * 0.03, 0.1, 32]} />
            <meshStandardMaterial color="#6d7f90" metalness={0.8} roughness={0.35} /></mesh>))}
      </group>
      <mesh position={[0, -0.4, 0]} {...h("Combustor")}><cylinderGeometry args={[0.7, 0.7, 0.5, 32, 1, true]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} side={THREE.DoubleSide} clippingPlanes={cutaway ? [plane] : []} /></mesh>
      <mesh position={[0, -2.35, 0]} rotation={[Math.PI, 0, 0]} {...h("Nozzle")}><coneGeometry args={[0.7, 1, 32, 1, true]} />
        <meshStandardMaterial color="#d1d9e0" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

function Fallback({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 400 160" role="img" aria-label="2D schematic of a turbofan engine" className="fallback">
      <rect x="40" y="40" width="320" height="80" rx="30" fill="#2a3a49" stroke="#8fa5b8" />
      <rect x="60" y="55" width="30" height="50" fill="#8fa5b8" /><rect x="120" y="60" width="90" height="40" fill="#6d7f90" />
      <rect x="215" y="62" width="50" height="36" fill={color} /><rect x="270" y="62" width="60" height="36" fill="#6d7f90" />
      <polygon points="360,50 395,70 395,90 360,110" fill="#d1d9e0" />
    </svg>
  );
}

export default function Engine3D(props: Omit<Props, "onHover"> & { label?: string }) {
  const [ok, setOk] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => { try { setOk(!!document.createElement("canvas").getContext("webgl")); } catch { setOk(false); } }, []);
  return (
    <div className="stage" role="img" aria-label={props.label ?? "Interactive 3D turbofan engine"}>
      {ok ? (
        <Canvas camera={{ position: [4.5, 2.5, 5], fov: 40 }} dpr={[1, 2]} gl={{ localClippingEnabled: true }}>
          <ambientLight intensity={0.7} /><directionalLight position={[5, 6, 4]} intensity={1.4} /><directionalLight position={[-4, -2, -3]} intensity={0.4} />
          <Engine {...props} onHover={setHover} /><OrbitControls enablePan={false} minDistance={4} maxDistance={11} />
        </Canvas>) : <Fallback color={props.color} />}
      {hover && <span className="tip">{hover}</span>}
    </div>
  );
}
