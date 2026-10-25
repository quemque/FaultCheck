import json
from pathlib import Path
from typing import Literal

import joblib
import polars as pl
from xgboost import XGBClassifier

from faultcheck.features import (
    FAILURE_MODES,
    OSF_LIMITS,
    SENSORS_BY_MODE,
    TARGETS,
    add_features,
    to_matrix,
)

ModelKind = Literal["xgb", "tree"]


def rule_check(sensor: dict) -> dict[str, bool]:
    """Физические правила из описания датасета — детерминированное подтверждение."""
    f = add_features(pl.DataFrame([sensor])).row(0, named=True)
    return {
        "twf": f["tool_wear_min"] >= 200,  # реально порог случайный 200–240
        "hdf": f["temp_diff"] < 8.6 and f["rotational_speed_rpm"] < 1380,
        "pwf": f["power_w"] < 3500 or f["power_w"] > 9000,
        "osf": f["strain"] > OSF_LIMITS[f["type"]],
    }


class FaultAnalyzer:
    def __init__(self, models_dir: Path = Path("artifacts")):
        meta = json.loads((models_dir / "meta.json").read_text())
        self.thresholds: dict[str, dict[str, float]] = meta["thresholds"]
        self.models: dict[str, dict[str, object]] = {"xgb": {}, "tree": {}}
        for target in TARGETS:
            m = XGBClassifier()
            m.load_model(models_dir / f"xgb_{target}.ubj")
            self.models["xgb"][target] = m
            self.models["tree"][target] = joblib.load(models_dir / f"tree_{target}.joblib")

    def analyze(self, sensor: dict, kind: ModelKind = "xgb") -> dict:
        X = to_matrix(pl.DataFrame([sensor]))
        models, thr = self.models[kind], self.thresholds[kind]

        def proba(target: str) -> float:
            return float(models[target].predict_proba(X)[0, 1])

        p_total = proba("machine_failure")
        is_failure = p_total >= thr["machine_failure"]
        rules = rule_check(sensor)

        modes = {}
        highlighted: list[str] = []
        for mode in FAILURE_MODES:
            p = proba(mode)
            predicted = p >= thr[mode]
            # TWF-модель почти бесполезна (порог износа случайный 200–240),
            # поэтому для него доверяем только физическому правилу
            active = rules[mode] if mode == "twf" else (predicted or rules[mode])
            modes[mode] = {
                "probability": p,
                "predicted": predicted,
                "rule_triggered": rules[mode],
                "active": active,
                "sensors": SENSORS_BY_MODE[mode],
            }
            if active:
                highlighted += [s for s in SENSORS_BY_MODE[mode] if s not in highlighted]

        return {
            "model": kind,
            "failure_probability": p_total,
            "is_failure": is_failure,
            "threshold": thr["machine_failure"],
            "modes": modes,
            "highlighted_sensors": highlighted,
            # отказ есть, а причин не найдено — вероятно случайный (RNF)
            "unexplained": is_failure and not highlighted,
        }
