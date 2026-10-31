import numpy as np


def mae(y, p): return float(np.mean(np.abs(np.asarray(y) - np.asarray(p))))
def rmse(y, p): return float(np.sqrt(np.mean((np.asarray(y) - np.asarray(p)) ** 2)))


def r2(y, p):
    y, p = np.asarray(y), np.asarray(p)
    ss_tot = np.sum((y - y.mean()) ** 2)
    return float(1 - np.sum((y - p) ** 2) / ss_tot) if ss_tot > 0 else float("nan")


def nasa_score(y, p):
    """d = predicted - actual. Late predictions (d >= 0) are penalised more. Lower is better."""
    d = np.asarray(p, dtype=np.float64) - np.asarray(y, dtype=np.float64)
    return float(np.sum(np.where(d < 0, np.exp(-d / 13.0) - 1, np.exp(d / 10.0) - 1)))


def regression_report(y, p) -> dict:
    return {"mae": mae(y, p), "rmse": rmse(y, p), "r2": r2(y, p), "nasa_score": nasa_score(y, p)}
