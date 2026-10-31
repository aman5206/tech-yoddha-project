import numpy as np
import pandas as pd


def make_sequences(df: pd.DataFrame, features, target_col=None, seq_len: int = 30,
                   pad_short: bool = False, last_only: bool = False):
    """Sliding windows per engine. Each window X_t = [x_{t-L+1}..x_t] gets target y_t.

    pad_short: front-pad engines shorter than seq_len by repeating their first row.
    last_only: return only the final window of each engine (official test protocol).
    Returns X (N, seq_len, F), y (N,) or None, engine_ids (N,).
    """
    Xs, ys, ids = [], [], []
    for eid, g in df.sort_values(["engine_id", "cycle"]).groupby("engine_id"):
        x = g[features].to_numpy(np.float32)
        y = g[target_col].to_numpy(np.float32) if target_col else None
        n = len(x)
        if n < seq_len:
            if not pad_short:
                continue
            pad = seq_len - n
            x = np.vstack([np.repeat(x[:1], pad, axis=0), x])
            if y is not None:
                y = np.concatenate([np.repeat(y[:1], pad), y])
            n = seq_len
        starts = np.array([n - seq_len]) if last_only else np.arange(n - seq_len + 1)
        idx = starts[:, None] + np.arange(seq_len)[None, :]
        Xs.append(x[idx])
        if y is not None:
            ys.append(y[starts + seq_len - 1])
        ids.append(np.full(len(starts), eid))
    X = np.concatenate(Xs).astype(np.float32)
    y = np.concatenate(ys).astype(np.float32) if target_col else None
    return X, y, np.concatenate(ids)
