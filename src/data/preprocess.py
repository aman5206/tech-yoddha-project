import pandas as pd
from .columns import CANDIDATE_FEATURES


def add_train_rul(df: pd.DataFrame, cap: int = 125) -> pd.DataFrame:
    """RUL = max_cycle - cycle; RUL_capped = min(RUL, cap). Uncapped RUL is kept."""
    df = df.copy()
    max_cycle = df.groupby("engine_id")["cycle"].transform("max")
    df["RUL"] = max_cycle - df["cycle"]
    df["RUL_capped"] = df["RUL"].clip(upper=cap)
    return df


def add_test_rul(test_df: pd.DataFrame, rul_df: pd.DataFrame, cap: int = 125) -> pd.DataFrame:
    """RUL_current = RUL_final + max_observed_cycle - current_cycle."""
    df = test_df.copy()
    final = df["engine_id"].map(rul_df.set_index("engine_id")["RUL_final"])
    max_cycle = df.groupby("engine_id")["cycle"].transform("max")
    df["RUL"] = final + max_cycle - df["cycle"]
    df["RUL_capped"] = df["RUL"].clip(upper=cap)
    return df


def select_features(train_df: pd.DataFrame, min_std: float = 1e-6) -> list:
    """Drop constant / near-constant channels, computed on training data only."""
    stds = train_df[CANDIDATE_FEATURES].std()
    return [c for c in CANDIDATE_FEATURES if stds[c] > min_std]
