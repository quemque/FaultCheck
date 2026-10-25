"""Обучение и сравнение моделей. Запуск: uv run train"""
import json
from pathlib import Path

import joblib
import numpy as np
import polars as pl
from sklearn.base import clone
from sklearn.metrics import (
    average_precision_score,
    balanced_accuracy_score,
    cohen_kappa_score,
    confusion_matrix,
    f1_score,
    fbeta_score,
    matthews_corrcoef,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier

from faultcheck.features import FEATURES, TARGETS, TYPE_MAPPING, to_matrix

ARTIFACTS = Path("artifacts")
SEED = 42
KINDS = ("xgb", "tree")
CV_FOLDS = 5

# Метрики, по которым сравниваем модели в кросс-валидации
CV_METRICS = ["pr_auc", "roc_auc", "r_precision", "mcc", "kappa", "g_mean", "f2", "precision", "recall"]

DF_SCHEMA = pl.Schema(
    {
        "udi": pl.Int64,
        "product_id": pl.String,
        "type": pl.String,
        "air_temperature_k": pl.Float64,
        "process_temperature_k": pl.Float64,
        "rotational_speed_rpm": pl.Int64,
        "torque_nm": pl.Float64,
        "tool_wear_min": pl.Int64,
        "machine_failure": pl.Boolean,
        "twf": pl.Boolean,
        "hdf": pl.Boolean,
        "pwf": pl.Boolean,
        "osf": pl.Boolean,
        "rnf": pl.Boolean,
    }
)


def normalize_column_name(name: str) -> str:
    return name.lower().replace(" ", "_").replace("[", "").replace("]", "")


def parse_csv(source: str, separator: str = ",") -> pl.DataFrame:
    return (
        pl.read_csv(source=source.encode(), separator=separator)
        .rename(mapping=normalize_column_name)
        .cast(DF_SCHEMA)
        .match_to_schema(DF_SCHEMA)
    )


def make_model(kind: str, y_train: np.ndarray):
    pos = int(y_train.sum())
    neg = len(y_train) - pos
    if kind == "xgb":
        return XGBClassifier(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=4,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=neg / max(pos, 1),
            eval_metric="aucpr",
            random_state=SEED,
        )
    return DecisionTreeClassifier(
        max_depth=6,
        min_samples_leaf=10,
        class_weight="balanced",
        random_state=SEED,
    )


def pick_threshold(model, X, y, n_splits: int = 5) -> float:
    """Порог по максимуму F1 на out-of-fold предсказаниях train (тест не трогаем)."""
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=SEED)
    proba = cross_val_predict(clone(model), X, y, cv=cv, method="predict_proba")[:, 1]
    p, r, t = precision_recall_curve(y, proba)
    f1 = 2 * p[:-1] * r[:-1] / np.clip(p[:-1] + r[:-1], 1e-12, None)
    return float(t[np.argmax(f1)])


def r_precision(y_true, proba) -> float:
    """Precision среди top-k по вероятности, где k = число реальных отказов."""
    k = int(y_true.sum())
    if k == 0:
        return float("nan")
    top = np.argsort(-proba, kind="stable")[:k]
    return float(y_true[top].mean())


def evaluate(y_true, proba, thr: float) -> dict:
    pred = (proba >= thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()
    recall = recall_score(y_true, pred, zero_division=0)
    specificity = tn / (tn + fp) if (tn + fp) else 0.0
    return {
        # не зависят от порога
        "pr_auc": average_precision_score(y_true, proba),
        "roc_auc": roc_auc_score(y_true, proba),
        "r_precision": r_precision(y_true, proba),
        # зависят от порога
        "precision": precision_score(y_true, pred, zero_division=0),
        "recall": recall,
        "specificity": specificity,
        "f1": f1_score(y_true, pred, zero_division=0),
        "f2": fbeta_score(y_true, pred, beta=2, zero_division=0),
        "balanced_accuracy": balanced_accuracy_score(y_true, pred),
        "g_mean": float(np.sqrt(recall * specificity)),
        "mcc": matthews_corrcoef(y_true, pred),
        "kappa": cohen_kappa_score(y_true, pred),
        "threshold": thr,
        "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp),
    }


def run_fold(kind, X, y, tr, te, inner_splits: int = 5):
    model = make_model(kind, y[tr])
    thr = pick_threshold(model, X[tr], y[tr], inner_splits)
    model.fit(X[tr], y[tr])
    proba = model.predict_proba(X[te])[:, 1]
    return model, evaluate(y[te], proba, thr)


def cross_validate_all(X, df) -> list[dict]:
    """Стратифицированная CV по каждой цели: среднее и разброс метрик по фолдам."""
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=SEED)
    summary = []
    for target in TARGETS:
        y = df[target].to_numpy().astype(int)
        for kind in KINDS:
            rows = [
                run_fold(kind, X, y, tr, te, inner_splits=3)[1]
                for tr, te in cv.split(X, y)
            ]
            entry = {"target": target, "model": kind}
            for m in CV_METRICS:
                vals = np.array([r[m] for r in rows], dtype=float)
                entry[f"{m}_mean"] = float(np.nanmean(vals))
                entry[f"{m}_std"] = float(np.nanstd(vals))
            summary.append(entry)
            print(f"  CV done: {target}/{kind}")
    return summary


def verdict(a: dict, b: dict, metric: str) -> str:
    """Победитель по метрике; если разница меньше разброса по фолдам — ничья."""
    d = a[f"{metric}_mean"] - b[f"{metric}_mean"]
    tol = max(a[f"{metric}_std"], b[f"{metric}_std"])
    if abs(d) <= tol:
        return "tie"
    return a["model"] if d > 0 else b["model"]


def print_cv_report(summary: list[dict]) -> None:
    fmt = lambda e, m: f"{e[f'{m}_mean']:.3f}±{e[f'{m}_std']:.3f}"
    table = pl.DataFrame(
        [{"target": e["target"], "model": e["model"], **{m: fmt(e, m) for m in CV_METRICS}} for e in summary]
    )
    with pl.Config(tbl_rows=50, tbl_cols=20):
        print("\n=== Кросс-валидация (среднее±std по 5 фолдам) ===")
        print(table)

    print("\n=== Вердикт (ничья, если разница меньше std) ===")
    for target in TARGETS:
        a, b = [e for e in summary if e["target"] == target]
        parts = {m: verdict(a, b, m) for m in ("pr_auc", "mcc", "kappa", "g_mean", "f2")}
        print(f"{target:16s} " + "  ".join(f"{m}={w}" for m, w in parts.items()))


def main():
    with open("dataset.csv", encoding="utf-8-sig") as f:
        df = parse_csv(f.read())

    df = df.with_columns(pl.col("type").replace_strict(TYPE_MAPPING, return_dtype=pl.Int64))
    X = to_matrix(df)

    idx_train, idx_test = train_test_split(
        np.arange(len(df)),
        test_size=0.2,
        random_state=SEED,
        stratify=df["machine_failure"].to_numpy(),
    )

    ARTIFACTS.mkdir(exist_ok=True)
    thresholds: dict = {"xgb": {}, "tree": {}}
    rows = []

    # 1) Отложенная выборка: модели, которые сохраняются для API
    for target in TARGETS:
        y = df[target].to_numpy().astype(int)
        for kind in KINDS:
            model, metrics = run_fold(kind, X, y, idx_train, idx_test)
            rows.append({"target": target, "model": kind, **metrics})
            thresholds[kind][target] = metrics["threshold"]

            if kind == "xgb":
                model.save_model(ARTIFACTS / f"xgb_{target}.ubj")
            else:
                joblib.dump(model, ARTIFACTS / f"tree_{target}.joblib")

    show = ["target", "model", "pr_auc", "r_precision", "precision", "recall", "f2", "g_mean", "mcc", "kappa", "tp", "fp", "fn"]
    with pl.Config(tbl_rows=50, tbl_cols=20, float_precision=3):
        print("=== Отложенная выборка (20%) ===")
        print(pl.DataFrame(rows).select(show))

    # 2) Кросс-валидация: устойчивое сравнение моделей
    print("\nCross-validation...")
    summary = cross_validate_all(X, df)
    print_cv_report(summary)

    (ARTIFACTS / "metrics.json").write_text(json.dumps(rows, indent=2))
    (ARTIFACTS / "cv_metrics.json").write_text(json.dumps(summary, indent=2))
    (ARTIFACTS / "meta.json").write_text(
        json.dumps({"features": FEATURES, "thresholds": thresholds}, indent=2)
    )
    print(f"\nSaved to {ARTIFACTS}/")


if __name__ == "__main__":
    main()
