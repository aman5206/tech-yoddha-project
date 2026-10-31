import numpy as np
import pandas as pd


def split_by_engine(df: pd.DataFrame, val_frac: float = 0.2, seed: int = 42):
    """Split by engine ID (never by row) to prevent leakage between engines."""
    ids = np.sort(df["engine_id"].unique())
    rng = np.random.default_rng(seed)
    rng.shuffle(ids)
    n_val = max(1, int(round(len(ids) * val_frac)))
    val_ids = set(ids[:n_val].tolist())
    is_val = df["engine_id"].isin(val_ids)
    return df[~is_val].copy(), df[is_val].copy()
