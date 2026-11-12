import json
from pathlib import Path
from typing import Annotated

import uvicorn
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from faultcheck.analysis import FaultAnalyzer, ModelKind

ANALYZER = FaultAnalyzer()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ModeResult(BaseModel):
    probability: float
    predicted: bool  # решение ML-модели по порогу
    rule_triggered: bool  # срабатывание физического правила
    active: bool  # итог: показывать как причину отказа
    sensors: list[str]  # какие датчики подсвечивать


class AnalysisResult(BaseModel):
    model: ModelKind
    failure_probability: float
    is_failure: bool
    threshold: float
    modes: dict[str, ModeResult]
    highlighted_sensors: list[str]
    unexplained: bool


@app.get("/")
async def root():
    return {}


def _read_artifact(name: str) -> list:
    path = Path("artifacts") / name
    return json.loads(path.read_text()) if path.exists() else []


@app.get("/metrics")
async def metrics():
    return {
        "holdout": _read_artifact("metrics.json"),  # отложенная выборка
        "cv": _read_artifact("cv_metrics.json"),  # кросс-валидация (mean/std)
    }


@app.get("/analyze")
async def analyze(
    type: Annotated[int, Query(ge=0, le=2, description="0=L, 1=M, 2=H")],
    air_temperature_k: float,
    process_temperature_k: float,
    rotational_speed_rpm: int,
    torque_nm: float,
    tool_wear_min: int,
    model: ModelKind = "xgb",
) -> AnalysisResult:
    sensor = {
        "type": type,
        "air_temperature_k": air_temperature_k,
        "process_temperature_k": process_temperature_k,
        "rotational_speed_rpm": rotational_speed_rpm,
        "torque_nm": torque_nm,
        "tool_wear_min": tool_wear_min,
    }
    return ANALYZER.analyze(sensor, kind=model)


def main():
    uvicorn.run("faultcheck.main:app", host="127.0.0.1", port=8123, reload=True)


if __name__ == "__main__":
    main()
