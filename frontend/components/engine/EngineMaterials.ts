import * as THREE from "three";

export type VisualizationMode =
  | "standard"
  | "cutaway"
  | "exploded"
  | "xray"
  | "wireframe"
  | "thermal"
  | "health"
  | "sensor";

export interface MaterialOptions {
  mode: VisualizationMode;
  componentId: string;
  selectedId: string | null;
  hoveredId: string | null;
  healthScore?: number;
  clippingPlanes?: THREE.Plane[];
  isCasing?: boolean;
}

// Thermal infrared false-color spectrum mapping
const THERMAL_PALETTE: Record<string, string> = {
  FAN_BLADES: "#38bdf8", // Cold inlet (~295 K)
  SPINNER_CONE: "#0284c7",
  FAN_CASING: "#0284c7",
  BYPASS_DUCT: "#0ea5e9",
  LPC_BOOSTER: "#22c55e", // Mild compression (~380 K)
  HPC_CORE: "#f59e0b", // Intense compression (~650 K - 820 K)
  HPC_CASING: "#d97706",
  COMBUSTOR_ANNULAR: "#dc2626", // Incandescent combustion flame (>1700 K)
  FUEL_INJECTORS: "#ea580c",
  HPT_STAGE_1: "#ef4444", // Extreme hot gas entry (~1550 K)
  HPT_STAGE_2: "#f97316",
  LPT_TURBINE: "#fbbf24", // Gas expansion (~1050 K)
  SHAFT_N1: "#38bdf8",
  SHAFT_N2: "#f59e0b",
  BEARING_COMPARTMENTS: "#10b981",
  EXHAUST_NOZZLE: "#ea580c",
  EXHAUST_CONE: "#f97316",
  ACCESSORY_GEARBOX: "#0284c7",
};

/**
 * Creates authentic PBR materials for turbofan components based on active visualization mode
 */
export function getTurbofanMaterial(
  opts: MaterialOptions,
  baseProps: {
    color: string;
    metalness?: number;
    roughness?: number;
    clearcoat?: number;
    emissive?: string;
    emissiveIntensity?: number;
  }
): THREE.Material {
  const { mode, componentId, selectedId, hoveredId, healthScore = 88, clippingPlanes = [], isCasing = false } = opts;
  const isSelected = selectedId === componentId;
  const isHovered = hoveredId === componentId;

  // 1. Wireframe Mode
  if (mode === "wireframe") {
    return new THREE.MeshBasicMaterial({
      color: isSelected ? "#38bdf8" : isHovered ? "#7dd3fc" : "#475569",
      wireframe: true,
      clippingPlanes,
    });
  }

  // 2. X-Ray Holographic Mode
  if (mode === "xray") {
    if (isCasing) {
      return new THREE.MeshPhysicalMaterial({
        color: "#38bdf8",
        transparent: true,
        opacity: 0.14,
        roughness: 0.15,
        transmission: 0.9,
        thickness: 0.8,
        depthWrite: false,
        clippingPlanes,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: isSelected ? "#38bdf8" : isHovered ? "#93c5fd" : baseProps.color,
      emissive: isSelected ? "#0284c7" : isHovered ? "#0369a1" : "#0f172a",
      emissiveIntensity: isSelected ? 0.85 : 0.35,
      metalness: 0.9,
      roughness: 0.2,
      clippingPlanes,
    });
  }

  // 3. Thermal Infrared Thermogram Mode
  if (mode === "thermal") {
    const tColor = THERMAL_PALETTE[componentId] || "#38bdf8";
    return new THREE.MeshStandardMaterial({
      color: tColor,
      emissive: tColor,
      emissiveIntensity: isSelected ? 0.9 : 0.45,
      roughness: 0.45,
      metalness: 0.4,
      clippingPlanes,
    });
  }

  // 4. Health Map Mode
  if (mode === "health") {
    let hColor = "#22c55e"; // Healthy (>80)
    if (healthScore < 50) hColor = "#ef4444"; // Critical
    else if (healthScore < 80) hColor = "#f59e0b"; // Warning/Monitor

    return new THREE.MeshStandardMaterial({
      color: hColor,
      emissive: hColor,
      emissiveIntensity: isSelected ? 0.8 : isHovered ? 0.5 : 0.28,
      metalness: 0.65,
      roughness: 0.3,
      clippingPlanes,
    });
  }

  // 5. Standard PBR Aerospace Materials
  const emissiveColor = isSelected ? "#0284c7" : isHovered ? "#0369a1" : baseProps.emissive || "#000000";
  const emissiveIntensity = isSelected ? 0.75 : isHovered ? 0.4 : baseProps.emissiveIntensity || 0;

  return new THREE.MeshStandardMaterial({
    color: isSelected ? "#38bdf8" : isHovered ? "#7dd3fc" : baseProps.color,
    metalness: baseProps.metalness ?? 0.85,
    roughness: baseProps.roughness ?? 0.25,
    emissive: emissiveColor,
    emissiveIntensity,
    side: isCasing ? THREE.DoubleSide : THREE.FrontSide,
    clippingPlanes,
  });
}

