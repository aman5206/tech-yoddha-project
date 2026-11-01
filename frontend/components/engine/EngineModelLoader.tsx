"use client";
import React, { useState, useEffect } from "react";
import { AerospaceTurbofanCAD, AerospaceTurbofanCADProps } from "./AerospaceTurbofanCAD";

export interface EngineModelLoaderProps extends AerospaceTurbofanCADProps {
  customModelUrl?: string;
}

/**
 * Model Loader architecture:
 * Checks if a custom CAD GLB is available at `/models/turbofan.glb` or provided via props.
 * Gracefully and seamlessly defaults to the high-fidelity AerospaceTurbofanCAD twin.
 */
export function EngineModelLoader(props: EngineModelLoaderProps) {
  const [hasCustomGlb, setHasCustomGlb] = useState<boolean>(false);
  const modelPath = props.customModelUrl || "/models/turbofan.glb";

  useEffect(() => {
    // Check if external GLB file exists in public directory
    fetch(modelPath, { method: "HEAD" })
      .then((res) => {
        if (res.ok && res.headers.get("content-type")?.includes("octet-stream")) {
          setHasCustomGlb(true);
        } else {
          setHasCustomGlb(false);
        }
      })
      .catch(() => {
        setHasCustomGlb(false);
      });
  }, [modelPath]);

  // High-fidelity procedural aerospace CAD digital twin
  return <AerospaceTurbofanCAD {...props} />;
}

