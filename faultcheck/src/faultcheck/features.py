"""Общая логика признаков: используется и при обучении, и в API."""
import math

import polars as pl

# Явный маппинг (LabelEncoder сортирует алфавитно: H=0, L=1, M=2 — а не L=0, M=1, H=2!)
TYPE_MAPPING = {"L": 0, "M": 1, "H": 2}

# Порог перенапряжения (OSF) по типу изделия, minNm
OSF_LIMITS = {0: 11_000.0, 1: 12_000.0, 2: 13_000.0}

# Порядок признаков фиксируем явно — от него зависит корректность predict
FEATURES = [
    "type",
    "air_temperature_k",
    "process_temperature_k",
    "rotational_speed_rpm",
    "torque_nm",
    "tool_wear_min",
    "temp_diff",
    "power_w",
    "strain",
    "strain_ratio",
]

# RNF (случайный отказ) предсказать принципиально нельзя — модель для него не строим
FAILURE_MODES = ["twf", "hdf", "pwf", "osf"]
TARGETS = ["machine_failure", *FAILURE_MODES]

# Какие датчики подсвечивать на фронте для каждого типа отказа
SENSORS_BY_MODE = {
    "twf": ["tool_wear_min"],
    "hdf": ["air_temperature_k", "process_temperature_k", "rotational_speed_rpm"],
    "pwf": ["torque_nm", "rotational_speed_rpm"],
    "osf": ["tool_wear_min", "torque_nm"],
}


def add_features(df: pl.DataFrame) -> pl.DataFrame:
    return df.with_columns(
        (pl.col("process_temperature_k") - pl.col("air_temperature_k")).alias("temp_diff"),
        # мощность в ваттах: момент * угловая скорость (рад/с)
        (pl.col("rotational_speed_rpm") * pl.col("torque_nm") * 2 * math.pi / 60).alias("power_w"),
        (pl.col("tool_wear_min") * pl.col("torque_nm")).alias("strain"),
    ).with_columns(
        (
            pl.col("strain")
            / pl.col("type").replace_strict(OSF_LIMITS, return_dtype=pl.Float64)
        ).alias("strain_ratio")
    )


def to_matrix(df: pl.DataFrame):
    return add_features(df).select(FEATURES).to_numpy()
