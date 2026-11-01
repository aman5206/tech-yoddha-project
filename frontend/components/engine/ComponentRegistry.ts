/**
 * AeroGuard AI — Turbofan Component Registry & Technical Knowledge Base
 * Engineering specifications following CFM56-7B / GE90 dual-spool high-bypass architecture.
 */

export interface ComponentSpec {
  id: string;
  code: string;
  name: string;
  subsystem: "Low-Pressure System" | "High-Pressure Core" | "Combustion System" | "Hot Section Turbines" | "Exhaust & Nacelle" | "Mechanical Auxiliary";
  station: string;
  material: string;
  nominalTempRange: string;
  nominalPressureRange: string;
  ratedSpeedRPM?: string;
  primaryFailureMode: string;
  sensors: string[];
  description: string;
  stageCount?: number;
  bladeCount?: number;
}

export const TURBOFAN_COMPONENT_REGISTRY: Record<string, ComponentSpec> = {
  FAN_BLADES: {
    id: "FAN_BLADES",
    code: "STA-02-FAN-BLD",
    name: "Wide-Chord Titanium Fan Blades",
    subsystem: "Low-Pressure System",
    station: "Station 2.0 (Inlet Face)",
    material: "Ti-6Al-4V (Grade 5 Alpha-Beta Titanium Alloy)",
    nominalTempRange: "288 K – 315 K (Ambient to +27°C)",
    nominalPressureRange: "14.7 – 23.5 psia (Pressure Ratio ~1.6:1)",
    ratedSpeedRPM: "2,388 – 2,550 RPM (N1 Low-Pressure Spool)",
    primaryFailureMode: "Foreign Object Damage (FOD), Leading-Edge Erosion, High-Cycle Fatigue (HCF)",
    sensors: ["s8 (Fan Physical Speed Nf)", "s13 (Corrected Fan Speed NRf)", "s15 (Bypass Ratio BPR)"],
    description: "24 wide-chord, aerodynamically twisted, solid titanium fan blades mounted into dovetail slots on the forged titanium fan disk. Generates ~80% of total takeoff propulsive thrust via the bypass duct.",
    bladeCount: 24,
  },
  SPINNER_CONE: {
    id: "SPINNER_CONE",
    code: "STA-01-SPN-CON",
    name: "Aerodynamic Spinner Cone",
    subsystem: "Low-Pressure System",
    station: "Station 1.0 (Engine Nose)",
    material: "Carbon-Fiber Reinforced Polymer (CFRP) with Titanium Tip & Heating Element",
    nominalTempRange: "250 K – 300 K",
    nominalPressureRange: "Ambient Ram Air",
    primaryFailureMode: "Bird Strike Impact, Ice Accretion Imbalance, Spiral Stripe Degraded Contrast",
    sensors: ["s1 (Fan Inlet Total Temperature T2)"],
    description: "Elliptical ogive spinner guiding laminar ambient airflow smoothly into the blade roots and hub, marked with an anti-ice optical warning spiral.",
  },
  FAN_CASING: {
    id: "FAN_CASING",
    code: "STA-02-FAN-CSG",
    name: "Fan Containment Casing & Acoustic Liner",
    subsystem: "Low-Pressure System",
    station: "Station 2.0 – 2.2",
    material: "Kevlar Aramid Wrap over High-Strength Armored Titanium Ring",
    nominalTempRange: "288 K – 330 K",
    nominalPressureRange: "14.7 – 24 psia",
    primaryFailureMode: "Acoustic Attenuation Delamination, Blade-Rub Abradable Seal Wear",
    sensors: ["s15 (Bypass Ratio BPR)"],
    description: "Structural blade-off containment case lined with Nomex honeycomb acoustic suppression panels and zero-clearance abradable tip rub-strips.",
  },
  BYPASS_DUCT: {
    id: "BYPASS_DUCT",
    code: "STA-22-BYP-DCT",
    name: "Bypass Duct & Outlet Guide Vanes (OGVs)",
    subsystem: "Exhaust & Nacelle",
    station: "Station 2.2 – 2.5",
    material: "Epoxy-Matrix Carbon Composite Panels with Aluminum Struts",
    nominalTempRange: "295 K – 340 K",
    nominalPressureRange: "22 – 25 psia",
    primaryFailureMode: "Guide Vane Aerodynamic Flutter, Acoustic Panel Moisture Ingress",
    sensors: ["s15 (Bypass Ratio BPR)"],
    description: "Annular cold bypass duct surrounding the engine core, housing structural Outlet Guide Vanes (OGVs) that remove swirl from the fan discharge air.",
  },
  LPC_BOOSTER: {
    id: "LPC_BOOSTER",
    code: "STA-24-LPC-BST",
    name: "Low-Pressure Compressor (3-Stage Booster)",
    subsystem: "Low-Pressure System",
    station: "Station 2.4",
    material: "Ti-6Al-4V Disks & Blades with Forged Titanium Casing",
    nominalTempRange: "340 K – 440 K",
    nominalPressureRange: "24 – 52 psia (Booster Pressure Ratio ~2.2:1)",
    ratedSpeedRPM: "2,388 RPM (N1 Low-Pressure Spool)",
    primaryFailureMode: "Interstage Bleed Valve Sticking, Blade Tip Rub, Stall Flutter",
    sensors: ["s2 (LPC Outlet Temp T24)"],
    description: "3-stage axial flow booster compressor driven directly by the N1 shaft, elevating pressure and velocity of core air before entry into the High-Pressure Compressor.",
    stageCount: 3,
  },
  HPC_CORE: {
    id: "HPC_CORE",
    code: "STA-30-HPC-CR9",
    name: "High-Pressure Compressor (9-Stage Blisks)",
    subsystem: "High-Pressure Core",
    station: "Station 2.5 – 3.0",
    material: "Stages 1-5 Ti-6Al-4V; Stages 6-9 Inconel 718 Nickel Superalloy",
    nominalTempRange: "440 K – 870 K (160°C to 597°C)",
    nominalPressureRange: "52 – 555 psia (Overall Pressure Ratio ~32.5:1)",
    ratedSpeedRPM: "9,050 – 9,800 RPM (N2 High-Pressure Spool)",
    primaryFailureMode: "Blade Tip Clearance Growth, Seal Labyrinth Spallation, Thermal Fatigue",
    sensors: ["s3 (HPC Outlet Temp T30)", "s7 (HPC Outlet Pressure P30)", "s9 (Core Physical Speed Nc)", "s11 (HPC Static Pressure Ps30)", "s14 (Corrected Core Speed NRc)"],
    description: "9-stage axial compressor with integrally bladed disks (blisks) driven by the N2 high-pressure shaft. Primary driver of thermodynamic degradation in NASA C-MAPSS dataset.",
    stageCount: 9,
  },
  HPC_CASING: {
    id: "HPC_CASING",
    code: "STA-30-HPC-CSG",
    name: "HPC Split Casing & Variable Stator Vanes (VSV)",
    subsystem: "High-Pressure Core",
    station: "Station 2.5 – 3.0",
    material: "Horizontally Split Ductile Titanium & Nickel Alloy Casting",
    nominalTempRange: "440 K – 850 K",
    nominalPressureRange: "52 – 550 psia",
    primaryFailureMode: "VSV Actuation Ring Bushing Wear, Bleed Air Port Cracking",
    sensors: ["s7 (P30)", "s11 (Ps30)"],
    description: "Split structural casing equipped with external torque rings actuating variable inlet guide vanes and stages 1-3 variable stator vanes to prevent compressor surge.",
  },
  COMBUSTOR_ANNULAR: {
    id: "COMBUSTOR_ANNULAR",
    code: "STA-36-CC-ANN",
    name: "Annular Combustor & Cooling Effusion Liner",
    subsystem: "Combustion System",
    station: "Station 3.6 – 4.0",
    material: "Hastelloy X / Haynes 230 Superalloy with Zirconia Ceramic TBC",
    nominalTempRange: "1,450 K – 1,950 K (Flame Core > 2,100 K)",
    nominalPressureRange: "520 – 550 psia",
    primaryFailureMode: "Liner Burn-Through, Effusion Hole Clogging, Ceramic Coating Spallation",
    sensors: ["s12 (Fuel Flow Ratio phi)", "s17 (Bleed Enthalpy ht)"],
    description: "Annular direct-flow combustion chamber featuring perforated double liners for film cooling, dilution ports, and acoustic dampening resonators.",
  },
  FUEL_INJECTORS: {
    id: "FUEL_INJECTORS",
    code: "STA-36-INJ-18",
    name: "Dual-Orifice Fuel Spray Nozzles (18 Injectors)",
    subsystem: "Combustion System",
    station: "Station 3.6 (Combustor Dome)",
    material: "316L Stainless Steel & Cobalt-Chrome Superalloy",
    nominalTempRange: "380 K – 720 K",
    nominalPressureRange: "Fuel Supply 850 – 1,200 psig",
    primaryFailureMode: "Coking of Spray Orifices, Streaking Pattern Distortion, Valve Leakage",
    sensors: ["s12 (Fuel Flow Ratio phi)"],
    description: "18 aerated fuel spray nozzles equipped with dual swirlers atomizing Jet-A1 fuel into a micro-droplet mist for clean, low-emission, stable combustion.",
  },
  HPT_STAGE_1: {
    id: "HPT_STAGE_1",
    code: "STA-41-HPT-ST1",
    name: "High-Pressure Turbine Stage 1 (Single Crystal)",
    subsystem: "Hot Section Turbines",
    station: "Station 4.1",
    material: "CMSX-4 Single-Crystal Nickel Superalloy + PtAl/YSZ Thermal Barrier Coating",
    nominalTempRange: "1,350 K – 1,650 K (Gas Stream > 1,700 K)",
    nominalPressureRange: "280 – 380 psia",
    ratedSpeedRPM: "9,050 – 9,800 RPM (N2 High-Pressure Spool)",
    primaryFailureMode: "Thermal Creep Rupture, Leading-Edge Oxidation, TBC Spalling",
    sensors: ["s20 (HPT Coolant Bleed W31)"],
    description: "Internally cooled single-crystal blades extracting extreme expansion power from hot combustor gases to drive the 9-stage HPC via the N2 spool.",
    bladeCount: 72,
  },
  HPT_STAGE_2: {
    id: "HPT_STAGE_2",
    code: "STA-42-HPT-ST2",
    name: "High-Pressure Turbine Stage 2",
    subsystem: "Hot Section Turbines",
    station: "Station 4.2",
    material: "Directionally Solidified Nickel Superalloy (Rene N5)",
    nominalTempRange: "1,200 K – 1,450 K",
    nominalPressureRange: "180 – 260 psia",
    ratedSpeedRPM: "9,050 – 9,800 RPM (N2 High-Pressure Spool)",
    primaryFailureMode: "Trailing Edge Micro-Cracking, Fir-Tree Root Fretting Fatigue",
    sensors: ["s20 (HPT Coolant Bleed W31)"],
    description: "Second stage HPT rotor with fir-tree root attachments locked into forged Inconel disks, providing secondary torque to the N2 spool.",
    bladeCount: 76,
  },
  LPT_TURBINE: {
    id: "LPT_TURBINE",
    code: "STA-50-LPT-ST4",
    name: "Low-Pressure Turbine (4-Stage Rotor Assembly)",
    subsystem: "Hot Section Turbines",
    station: "Station 4.5 – 5.0",
    material: "Inconel 718 Disks & Udimet 720 Shrouded Blades",
    nominalTempRange: "850 K – 1,200 K (EGT Reference Zone)",
    nominalPressureRange: "28 – 95 psia",
    ratedSpeedRPM: "2,388 RPM (N1 Low-Pressure Spool)",
    primaryFailureMode: "Inter-Stage Stator Bowing, Tip Shroud Interlock Wear, Thermal Erosion",
    sensors: ["s4 (LPT Outlet Temp T50)", "s21 (LPT Coolant Bleed W32)"],
    description: "4-stage counter-expanding low-pressure turbine with tip-shrouded blades that extracts remaining gas energy to drive the front fan and 3-stage LPC via the N1 shaft.",
    stageCount: 4,
  },
  SHAFT_N1: {
    id: "SHAFT_N1",
    code: "STA-00-SHF-N1",
    name: "Low-Pressure Concentric Drive Shaft (N1)",
    subsystem: "Low-Pressure System",
    station: "Station 2.0 – 5.2 (Full Engine Axis)",
    material: "V-57 Heat-Treated High-Strength Alloy Steel",
    nominalTempRange: "340 K – 480 K",
    nominalPressureRange: "Enclosed Internal Oil Cavity",
    ratedSpeedRPM: "2,388 RPM",
    primaryFailureMode: "Torsional Shear Fatigue, Spline Coupling Fretting, Dynamic Unbalance",
    sensors: ["s8 (Fan Physical Speed Nf)"],
    description: "Longitudinal solid/tubular inner drive shaft connecting the LPT directly to the front fan rotor and LPC booster.",
  },
  SHAFT_N2: {
    id: "SHAFT_N2",
    code: "STA-00-SHF-N2",
    name: "High-Pressure Hollow Outer Shaft (N2)",
    subsystem: "High-Pressure Core",
    station: "Station 2.5 – 4.3 (Core Axis)",
    material: "Carburized High-Nickel Martensitic Steel",
    nominalTempRange: "420 K – 590 K",
    nominalPressureRange: "Enclosed Cavity",
    ratedSpeedRPM: "9,050 – 9,800 RPM",
    primaryFailureMode: "Thermal Growth Misalignment, Oil Seal Carbon Ring Spallation",
    sensors: ["s9 (Core Physical Speed Nc)"],
    description: "Large-diameter hollow shaft concentric over the N1 shaft, coupling the 2-stage HPT to the 9-stage HPC core.",
  },
  BEARING_COMPARTMENTS: {
    id: "BEARING_COMPARTMENTS",
    code: "STA-00-BRG-1TO5",
    name: "Bearing Chambers (#1 through #5)",
    subsystem: "Mechanical Auxiliary",
    station: "Front, Center, & Aft Sump Cavities",
    material: "M50 Nil Vacuum-Induction Melted Bearing Steel with Silver-Plated Cages",
    nominalTempRange: "380 K – 470 K",
    nominalPressureRange: "Pressurized Sump 35 – 55 psi",
    primaryFailureMode: "Spalling Fatigue, Lubrication Starvation, Labyrinth Air Seal Leakage",
    sensors: ["s9 (Nc)", "s8 (Nf)"],
    description: "#1 Roller (Fan Hub), #2 Ball Thrust (Front Core), #3 Inter-Shaft Roller, #4 Roller (HPT Core), and #5 Roller (LPT Rear Sump) bearing assemblies.",
  },
  EXHAUST_NOZZLE: {
    id: "EXHAUST_NOZZLE",
    code: "STA-58-EXH-NZL",
    name: "Core Exhaust Convergent Nozzle & Mixer",
    subsystem: "Exhaust & Nacelle",
    station: "Station 5.8 (Core Exit)",
    material: "Titanium-Aluminide & Inconel 625 Welded Assembly",
    nominalTempRange: "720 K – 950 K",
    nominalPressureRange: "15.5 – 22 psia",
    primaryFailureMode: "Thermal Buckling, Acoustic Acoustic Fatigue Cracking",
    sensors: ["s4 (T50)"],
    description: "Convergent core exhaust nozzle directing high-velocity core gas into the atmosphere, creating reactive thrust and noise-damping shear mixing.",
  },
  EXHAUST_CONE: {
    id: "EXHAUST_CONE",
    code: "STA-60-EXH-CON",
    name: "Aerodynamic Center Tail Plug (Cone)",
    subsystem: "Exhaust & Nacelle",
    station: "Station 6.0",
    material: "Inconel 625 Spun Sheet Metal with Thermal Insulation",
    nominalTempRange: "650 K – 880 K",
    nominalPressureRange: "Ambient Exhaust Wake",
    primaryFailureMode: "Vibration Rivet Loosening, Thermal Discoloration",
    sensors: ["s4 (T50)"],
    description: "Aft aerodynamic tail cone preventing boundary layer separation and flow stagnation behind the LPT turbine disk.",
  },
  ACCESSORY_GEARBOX: {
    id: "ACCESSORY_GEARBOX",
    code: "STA-00-AGB-DRV",
    name: "Accessory Gearbox (AGB) & Radial Bevel Drive",
    subsystem: "Mechanical Auxiliary",
    station: "Fan Case 6 o'clock Mount",
    material: "Cast Magnesium-Zirconium / Aluminum Alloy Casing",
    nominalTempRange: "330 K – 395 K",
    nominalPressureRange: "Lubrication Oil 45 – 65 psi",
    ratedSpeedRPM: "Internal Gear Reduction ~4,800 RPM",
    primaryFailureMode: "Bevel Gear Tooth Pitting, Scavenge Pump Seal Leakage, Starter Spline Wear",
    sensors: ["s9 (Nc Auxiliary Ratio)"],
    description: "Bottom-mounted accessory transmission driven by a radial tower shaft from the N2 spool, powering the engine fuel metering unit (FMU), lube pumps, and starter generator.",
  },
};

/**
 * Normalizes user click or mesh name to semantic registry key
 */
export function resolveComponentId(meshName: string): string | null {
  const n = meshName.toUpperCase();
  if (n.includes("FAN") && (n.includes("BLADE") || n.includes("ROTOR"))) return "FAN_BLADES";
  if (n.includes("SPINNER") || n.includes("NOSE")) return "SPINNER_CONE";
  if (n.includes("FAN") && (n.includes("CASE") || n.includes("COWL"))) return "FAN_CASING";
  if (n.includes("BYPASS") || n.includes("DUCT") || n.includes("OGV")) return "BYPASS_DUCT";
  if (n.includes("LPC") || n.includes("BOOSTER")) return "LPC_BOOSTER";
  if (n.includes("HPC") || n.includes("COMPRESSOR") || n.includes("BLISK")) return "HPC_CORE";
  if (n.includes("VSV") || n.includes("STATOR_RING")) return "HPC_CASING";
  if (n.includes("INJECTOR") || n.includes("NOZZLE") && n.includes("FUEL")) return "FUEL_INJECTORS";
  if (n.includes("COMBUST") || n.includes("FLAME") || n.includes("BURNER")) return "COMBUSTOR_ANNULAR";
  if (n.includes("HPT") || (n.includes("TURBINE") && n.includes("HIGH"))) return "HPT_STAGE_1";
  if (n.includes("LPT") || (n.includes("TURBINE") && n.includes("LOW"))) return "LPT_TURBINE";
  if (n.includes("SHAFT") || n.includes("SPOOL") || n.includes("N1") || n.includes("N2")) return "SHAFT_N1";
  if (n.includes("BEARING") || n.includes("SUMP")) return "BEARING_COMPARTMENTS";
  if (n.includes("EXHAUST") && (n.includes("CONE") || n.includes("PLUG"))) return "EXHAUST_CONE";
  if (n.includes("EXHAUST") || n.includes("MIXER") || n.includes("TAIL")) return "EXHAUST_NOZZLE";
  if (n.includes("GEARBOX") || n.includes("AGB") || n.includes("PUMP")) return "ACCESSORY_GEARBOX";
  
  // Direct match fallback
  if (TURBOFAN_COMPONENT_REGISTRY[meshName]) return meshName;
  return null;
}

