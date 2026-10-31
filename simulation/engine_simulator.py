"""Cycle-by-cycle playback of a test engine against the running API.

    python -m simulation.engine_simulator --engine 24 --step 5 --delay 0.1
"""
import argparse
import time

import requests


def run(api: str, engine: int, step: int, delay: float, model: str = None):
    cycle, max_cycle = 1, None
    while max_cycle is None or cycle <= max_cycle:
        r = requests.get(f"{api}/simulation/{engine}/cycle/{cycle}",
                         params={"model": model} if model else None, timeout=30)
        r.raise_for_status()
        d = r.json()
        max_cycle = d["max_cycle"]
        flag = " <-- ALERT" if d["health_status"] in ("WARNING", "CRITICAL") else ""
        print(f"cycle {d['cycle']:>3}/{max_cycle}  pred {d['predicted_rul']:>6.1f}  "
              f"actual {d['actual_rul']:>4}  {d['health_status']:<8}{flag}")
        if cycle == max_cycle:
            break
        cycle = min(cycle + step, max_cycle)
        time.sleep(delay)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default="http://localhost:8000")
    ap.add_argument("--engine", type=int, default=1)
    ap.add_argument("--step", type=int, default=5)
    ap.add_argument("--delay", type=float, default=0.2)
    ap.add_argument("--model", default=None)
    a = ap.parse_args()
    run(a.api, a.engine, a.step, a.delay, a.model)
