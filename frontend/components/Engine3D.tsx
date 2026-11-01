"use client";
import React from "react";
import { EngineScene, EngineSceneProps } from "./engine/EngineScene";

export type { EngineSceneProps as Engine3DProps };

/**
 * AeroGuard AI — Production 3D Aerospace Turbofan Digital Twin Viewer
 * Fully upgraded with authentic aerodynamics, aerofoil blade geometry,
 * dual-spool kinematics, 9-stage HPC, 2-stage HPT, annular combustor, and PBR materials.
 */
export default function Engine3D(props: EngineSceneProps) {
  return <EngineScene {...props} />;
}
