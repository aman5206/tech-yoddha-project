from pathlib import Path
import pandas as pd
from .columns import ALL_COLS


def _read(path: Path, names):
    # sep=r"\s+" also avoids the empty trailing columns caused by trailing spaces
    return pd.read_csv(path, sep=r"\s+", header=None, names=names)


def load_train(data_dir="data/raw", dataset="FD001") -> pd.DataFrame:
    return _read(Path(data_dir) / f"train_{dataset}.txt", ALL_COLS)


def load_test(data_dir="data/raw", dataset="FD001") -> pd.DataFrame:
    return _read(Path(data_dir) / f"test_{dataset}.txt", ALL_COLS)


def load_rul(data_dir="data/raw", dataset="FD001") -> pd.DataFrame:
    """True RUL at the last observed cycle of each test engine (row i -> engine i+1)."""
    df = _read(Path(data_dir) / f"RUL_{dataset}.txt", ["RUL_final"])
    df.insert(0, "engine_id", range(1, len(df) + 1))
    return df


def validate(df: pd.DataFrame) -> dict:
    return {
        "rows": len(df),
        "engines": int(df["engine_id"].nunique()),
        "missing_values": int(df.isna().sum().sum()),
        "duplicate_rows": int(df.duplicated().sum()),
        "cycles_contiguous": bool(
            df.groupby("engine_id")["cycle"].apply(lambda s: (s.diff().dropna() == 1).all()).all()
        ),
    }
