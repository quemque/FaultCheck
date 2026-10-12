from typing import Annotated

import polars as pl
import uvicorn
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from xgboost import XGBClassifier

from faultcheck.analysis import calculate_probability

MODEL = XGBClassifier()
MODEL.load_model("model.ubj")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {}


@app.get("/analyze")
async def analyze(
    type: Annotated[int, Query(ge=0, le=2)],
    air_temperature_k: float,
    process_temperature_k: float,
    rotational_speed_rpm: int,
    torque_nm: float,
    tool_wear_min: int,
) -> float:
    sensor_data = pl.DataFrame(
        [
            {
                "type": type,
                "air_temperature_k": air_temperature_k,
                "process_temperature_k": process_temperature_k,
                "rotational_speed_rpm": rotational_speed_rpm,
                "torque_nm": torque_nm,
                "tool_wear_min": tool_wear_min,
            }
        ]
    )
    return calculate_probability(model=MODEL, sensor_data=sensor_data)


def main():
    uvicorn.run(
        "faultcheck.main:app",
        host="127.0.0.1",
        port=8123,
        reload=True,
    )


if __name__ == "__main__":
    main()
