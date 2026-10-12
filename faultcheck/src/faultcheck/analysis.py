import polars as pl
from xgboost import XGBClassifier

DeviceType = pl.Enum(["L", "M", "H"])

SENSOR_DATA_SCHEMA = pl.Schema(
    {
        "type": DeviceType,
        "air_temperature_k": float,
        "process_temperature_k": float,
        "rotational_speed_rpm": int,
        "torque_nm": float,
        "tool_wear_min": int,
    }
)


def calculate_probability(
    model: XGBClassifier,
    sensor_data: pl.DataFrame,
) -> float:
    single_sensor_data = sensor_data.with_columns(
        [
            (pl.col("process_temperature_k") - pl.col("air_temperature_k")).alias(
                "temp_diff"
            ),
            (pl.col("rotational_speed_rpm") * pl.col("torque_nm")).alias("power"),
        ]
    )
    prob_fail = model.predict_proba(single_sensor_data.to_numpy())[0, 1]

    return float(prob_fail)
