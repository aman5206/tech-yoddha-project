"""Train XGBoost, LSTM and GRU on C-MAPSS and save artifacts.

Usage (from repo root):
    python -m src.models.train_models --dataset FD001 --epochs 50
"""
import argparse
import json
import time
from pathlib import Path

import joblib
import numpy as np
import torch
from sklearn.preprocessing import StandardScaler
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from src.data.load_data import load_rul, load_test, load_train, validate
from src.data.preprocess import add_test_rul, add_train_rul, select_features
from src.data.split_data import split_by_engine
from src.models.architectures import RNNRegressor
from src.models.metrics import regression_report
from src.models.sequence_utils import make_sequences

CFG = dict(seq_len=30, hidden=64, layers=2, dropout=0.2, batch_size=128, lr=1e-3,
           epochs=50, patience=8, weight_decay=1e-5, clip=1.0, cap=125, val_frac=0.2, seed=42)


def predict_rnn(model, X, device, cap, bs=512):
    model.eval()
    out = []
    with torch.no_grad():
        for i in range(0, len(X), bs):
            xb = torch.from_numpy(X[i:i + bs]).to(device)
            out.append(model(xb).cpu().numpy())
    return np.concatenate(out) * cap


def train_rnn(kind, Xtr, ytr, Xva, yva, cfg, device, ckpt):
    cap = cfg["cap"]
    model = RNNRegressor(kind, Xtr.shape[2], cfg["hidden"], cfg["layers"], cfg["dropout"]).to(device)
    opt = torch.optim.Adam(model.parameters(), lr=cfg["lr"], weight_decay=cfg["weight_decay"])
    sched = torch.optim.lr_scheduler.ReduceLROnPlateau(opt, factor=0.5, patience=3)
    loss_fn = nn.MSELoss()
    loader = DataLoader(TensorDataset(torch.from_numpy(Xtr), torch.from_numpy(ytr / cap)),
                        batch_size=cfg["batch_size"], shuffle=True)
    best, bad, history = float("inf"), 0, []
    for epoch in range(1, cfg["epochs"] + 1):
        model.train()
        total = 0.0
        for xb, yb in loader:
            xb, yb = xb.to(device), yb.to(device)
            opt.zero_grad()
            loss = loss_fn(model(xb), yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), cfg["clip"])
            opt.step()
            total += loss.item() * len(xb)
        tr_loss = total / len(loader.dataset)
        pv = predict_rnn(model, Xva, device, 1.0)          # normalised scale
        va_loss = float(np.mean((pv - yva / cap) ** 2))
        sched.step(va_loss)
        history.append({"epoch": epoch, "train_loss": tr_loss, "val_loss": va_loss})
        print(f"[{kind.upper()}] epoch {epoch:02d} train {tr_loss:.5f} val {va_loss:.5f}")
        if va_loss < best - 1e-6:
            best, bad = va_loss, 0
            torch.save(model.state_dict(), ckpt)
        else:
            bad += 1
            if bad >= cfg["patience"]:
                print(f"[{kind.upper()}] early stopping at epoch {epoch}")
                break
    model.load_state_dict(torch.load(ckpt, map_location=device))
    return model, history


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="FD001")
    ap.add_argument("--data-dir", default="data/raw")
    ap.add_argument("--out-dir", default="artifacts/models")
    ap.add_argument("--epochs", type=int, default=CFG["epochs"])
    ap.add_argument("--seq-len", type=int, default=CFG["seq_len"])
    ap.add_argument("--skip-xgb", action="store_true")
    args = ap.parse_args()

    cfg = dict(CFG, epochs=args.epochs, seq_len=args.seq_len)
    np.random.seed(cfg["seed"])
    torch.manual_seed(cfg["seed"])
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    # ---- data -----------------------------------------------------------
    train_raw = add_train_rul(load_train(args.data_dir, args.dataset), cfg["cap"])
    test_raw = add_test_rul(load_test(args.data_dir, args.dataset),
                            load_rul(args.data_dir, args.dataset), cfg["cap"])
    print("train validation:", validate(train_raw))
    rul_final = load_rul(args.data_dir, args.dataset).set_index("engine_id")["RUL_final"]

    tr_df, va_df = split_by_engine(train_raw, cfg["val_frac"], cfg["seed"])
    features = select_features(tr_df)
    print(f"{len(features)} features kept: {features}")

    scaler = StandardScaler().fit(tr_df[features])             # training engines only
    scale = lambda d: d.assign(**dict(zip(features, scaler.transform(d[features]).T)))
    tr_s, va_s, te_s = scale(tr_df), scale(va_df), scale(test_raw)

    L = cfg["seq_len"]
    Xtr, ytr, _ = make_sequences(tr_s, features, "RUL_capped", L)
    Xva, yva, _ = make_sequences(va_s, features, "RUL_capped", L)
    Xte, _, te_ids = make_sequences(te_s, features, None, L, pad_short=True, last_only=True)
    y_te_raw = rul_final.loc[te_ids].to_numpy(np.float32)
    y_te_cap = np.minimum(y_te_raw, cfg["cap"])
    print("shapes:", Xtr.shape, Xva.shape, Xte.shape)

    results, files, timings = {}, {}, {}

    def record(name, p_val, p_test, ms):
        results[name] = {
            "validation": regression_report(yva, p_val),
            "test_capped": regression_report(y_te_cap, p_test),   # true RUL capped at 125
            "test_raw": regression_report(y_te_raw, p_test),      # true RUL as provided
            "inference_ms_per_sample": ms,
        }
        print(name, json.dumps(results[name], indent=2))

    # ---- XGBoost baseline (current cycle only) ---------------------------
    if not args.skip_xgb:
        import xgboost as xgb
        xtr_rows, ytr_rows = tr_s[features].to_numpy(np.float32), tr_s["RUL_capped"].to_numpy(np.float32)
        xgbm = xgb.XGBRegressor(n_estimators=400, max_depth=5, learning_rate=0.05,
                                subsample=0.8, colsample_bytree=0.8, random_state=cfg["seed"])
        xgbm.fit(xtr_rows, ytr_rows)
        va_last = va_s[features].to_numpy(np.float32)
        te_last = te_s.sort_values(["engine_id", "cycle"]).groupby("engine_id").tail(1)[features].to_numpy(np.float32)
        # validation: same sample set as the sequence models (windows ending at cycle >= L)
        va_mask = va_s.sort_values(["engine_id", "cycle"]).groupby("engine_id").cumcount().to_numpy() >= L - 1
        va_rows = va_s.sort_values(["engine_id", "cycle"])[features].to_numpy(np.float32)[va_mask]
        t0 = time.perf_counter()
        p_te = xgbm.predict(te_last)
        ms = (time.perf_counter() - t0) / len(te_last) * 1000
        record("xgboost", xgbm.predict(va_rows), p_te, ms)
        xgbm.save_model(out / "xgboost.json")
        files["xgboost"] = "xgboost.json"

    # ---- LSTM / GRU ------------------------------------------------------
    for kind in ("lstm", "gru"):
        model, hist = train_rnn(kind, Xtr, ytr, Xva, yva, cfg, device, out / f"{kind}.pt")
        t0 = time.perf_counter()
        p_te = predict_rnn(model, Xte, device, cfg["cap"])
        ms = (time.perf_counter() - t0) / len(Xte) * 1000
        record(kind, predict_rnn(model, Xva, device, cfg["cap"]), p_te, ms)
        files[kind] = f"{kind}.pt"
        (out / f"{kind}_history.json").write_text(json.dumps(hist))

    # ---- save versioned bundle ------------------------------------------
    best = min(results, key=lambda k: results[k]["validation"]["rmse"])
    joblib.dump(scaler, out / "scaler.joblib")
    config = {"dataset": args.dataset, "features": features, "seq_len": L, "cap": cfg["cap"],
              "hidden": cfg["hidden"], "layers": cfg["layers"], "dropout": cfg["dropout"],
              "best_model": best, "files": files, "version": time.strftime("%Y%m%d-%H%M%S")}
    (out / "config.json").write_text(json.dumps(config, indent=2))
    (out / "results.json").write_text(json.dumps(results, indent=2))
    print(f"Best model by validation RMSE: {best}. Artifacts saved to {out}")


if __name__ == "__main__":
    main()
