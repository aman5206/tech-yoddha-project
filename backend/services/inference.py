import json
from pathlib import Path

import joblib
import numpy as np
import torch

from src.models.architectures import RNNRegressor


class Predictor:
    """Loads model + scaler + config together so they are always versioned as one bundle."""

    def __init__(self, artifacts_dir: str = "artifacts/models"):
        d = Path(artifacts_dir)
        self.cfg = json.loads((d / "config.json").read_text())
        self.scaler = joblib.load(d / "scaler.joblib")
        self.features = self.cfg["features"]
        self.seq_len = self.cfg["seq_len"]
        self.cap = self.cfg["cap"]
        self.models = {}
        for name, fname in self.cfg["files"].items():
            if name == "xgboost":
                import xgboost as xgb
                m = xgb.XGBRegressor()
                m.load_model(d / fname)
            else:
                m = RNNRegressor(name, len(self.features), self.cfg["hidden"],
                                 self.cfg["layers"], self.cfg["dropout"])
                m.load_state_dict(torch.load(d / fname, map_location="cpu"))
                m.eval()
            self.models[name] = m
        self.default_model = self.cfg["best_model"]

    def predict(self, rows, model_name: str = None) -> dict:
        name = model_name or self.default_model
        if name not in self.models:
            raise ValueError(f"Unknown model '{name}'. Available: {list(self.models)}")
        x = np.asarray(rows, dtype=np.float32)
        if x.ndim != 2 or x.shape[1] != len(self.features):
            raise ValueError(f"Each row needs {len(self.features)} values in order: {self.features}")
        x = self.scaler.transform(x).astype(np.float32)
        padded = len(x) < self.seq_len
        if padded:  # engine younger than the window: repeat first reading
            x = np.vstack([np.repeat(x[:1], self.seq_len - len(x), axis=0), x])
        x = x[-self.seq_len:]
        if name == "xgboost":
            rul = float(self.models[name].predict(x[-1:])[0])
        else:
            with torch.no_grad():
                rul = float(self.models[name](torch.from_numpy(x[None])).item()) * self.cap
        return {"rul": max(0.0, rul), "model": name, "padded": padded}
