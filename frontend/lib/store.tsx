"use client";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useSimulation, Sim } from "../hooks/useSimulation";
import { Fleet, ModelsStatus, getFleet, getModels } from "./api";
import { AsyncState, useAsync } from "./ui";

export interface Settings { model: string; step: number; reducedMotion: boolean; compact: boolean }
export type Review = "Pending" | "Reviewed" | "Completed";
interface Ctx {
  engine: number; setEngine: (n: number) => void; settings: Settings; setSettings: (s: Settings) => void;
  models: AsyncState<ModelsStatus>; fleet: AsyncState<Fleet>; sim: Sim; activeModel: string;
  review: Record<number, Review>; setReview: (id: number, r: Review) => void;
}
const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(AppCtx); if (!c) throw new Error("AppProvider missing"); return c; };

const DEFAULTS: Settings = { model: "", step: 5, reducedMotion: false, compact: false };

export function AppProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState(24);
  const [settings, setSettingsState] = useState<Settings>(DEFAULTS);
  const [review, setReviewState] = useState<Record<number, Review>>({});
  const models = useAsync(getModels, []);
  const fleet = useAsync(getFleet, []);
  const activeModel = settings.model || models.data?.default_model || "";
  const sim = useSimulation(engine, activeModel, settings.step);

  useEffect(() => {
    try {
      const s = localStorage.getItem("aeroguard.settings"); if (s) setSettingsState({ ...DEFAULTS, ...JSON.parse(s) });
      const r = localStorage.getItem("aeroguard.review"); if (r) setReviewState(JSON.parse(r));
    } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => { document.documentElement.dataset.compact = String(settings.compact); }, [settings.compact]);

  const setSettings = (s: Settings) => { setSettingsState(s); try { localStorage.setItem("aeroguard.settings", JSON.stringify(s)); } catch { /* ignore */ } };
  const setReview = (id: number, r: Review) => {
    const next = { ...review, [id]: r }; setReviewState(next);
    try { localStorage.setItem("aeroguard.review", JSON.stringify(next)); } catch { /* ignore */ }
  };
  return <AppCtx.Provider value={{ engine, setEngine, settings, setSettings, models, fleet, sim, activeModel, review, setReview }}>{children}</AppCtx.Provider>;
}
