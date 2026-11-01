import * as THREE from "three";

export interface ExplodedOffsets {
  fanZ: number;
  nacelleX: number;
  lpcZ: number;
  hpcZ: number;
  combustorZ: number;
  hptZ: number;
  lptZ: number;
  exhaustZ: number;
  gearboxY: number;
}

/**
 * Calculates aerodynamic axial and radial explosion offsets for turbofan assemblies
 */
export function getExplodedOffsets(amount: number): ExplodedOffsets {
  const k = Math.max(0, Math.min(amount, 1.5));
  return {
    fanZ: -1.75 * k,
    nacelleX: 0.95 * k,
    lpcZ: -0.9 * k,
    hpcZ: -0.3 * k,
    combustorZ: 0.35 * k,
    hptZ: 0.85 * k,
    lptZ: 1.55 * k,
    exhaustZ: 2.35 * k,
    gearboxY: -0.65 * k,
  };
}

