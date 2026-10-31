"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, SensorData, SimPoint, getAlerts, getSensors, simulate } from "../lib/api";

/** Replays a test engine: every `step` cycles the readings so far are sent to the backend for a new RUL prediction. */
export function useSimulation(engine: number, model: string, step: number) {
  const [points, setPoints] = useState<SimPoint[]>([]);
  const [sensors, setSensors] = useState<SensorData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cycle = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const live = useRef({ engine, model, step });
  live.current = { engine, model, step };

  const pause = useCallback(() => { clearTimeout(timer.current); setRunning(false); }, []);

  const tick = useCallback(async () => {
    const { engine: e, model: m, step: s } = live.current;
    try {
      const p = await simulate(e, cycle.current, m || undefined);
      const [sd, al] = await Promise.all([getSensors(e, p.cycle), getAlerts()]);
      setPoints((prev) => [...prev, p]); setSensors(sd); setAlerts(al);
      if (p.cycle >= p.max_cycle) { setRunning(false); return; }
      cycle.current = Math.min(p.cycle + s, p.max_cycle);
      timer.current = setTimeout(tick, 400);
    } catch (err) { setError((err as Error).message); setRunning(false); }
  }, []);

  const seek = useCallback(async (c: number) => {
    pause();
    const { engine: e, model: m, step: s } = live.current;
    try {
      const p = await simulate(e, c, m || undefined);
      const [sd, al] = await Promise.all([getSensors(e, p.cycle), getAlerts()]);
      setPoints((prev) => [...prev.filter((x) => x.cycle < p.cycle), p]); setSensors(sd); setAlerts(al);
      cycle.current = Math.min(p.cycle + s, p.max_cycle);
    } catch (err) { setError((err as Error).message); }
  }, [pause]);

  const start = () => { setError(null); setRunning(true); tick(); };
  const reset = useCallback(() => { pause(); cycle.current = 1; setPoints([]); setSensors(null); setError(null); }, [pause]);
  useEffect(() => { reset(); }, [engine, reset]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const last = points[points.length - 1];
  return { points, last, sensors, alerts, running, error, finished: !!last && last.cycle >= last.max_cycle, start, pause, reset, seek };
}
export type Sim = ReturnType<typeof useSimulation>;
