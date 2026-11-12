import polars as pl
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

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


def parse_csv(source: str, separator: str) -> pl.DataFrame:
    return (
        pl.read_csv(
            source=source.encode(),
            separator=separator,
        )
        .rename(mapping=normalize_column_name)
        .cast(DF_SCHEMA)
        .match_to_schema(DF_SCHEMA)
    )


def main():
    with open("dataset.csv", encoding="utf-8-sig") as file:
        df = parse_csv(file.read(), separator=",")

    # Убираем ID и все целевые колонки конкретных типов поломок
    X = df.drop(
        ["udi", "product_id", "machine_failure", "twf", "hdf", "pwf", "osf", "rnf"]
    )
    y = df["machine_failure"]

    # --- Инженерия признаков (Feature Engineering) ---
    # Физические законы подсказывают модели, где искать аномалии
    X = X.with_columns(
        [
            (pl.col("process_temperature_k") - pl.col("air_temperature_k")).alias(
                "temp_diff"
            ),
            (pl.col("rotational_speed_rpm") * pl.col("torque_nm")).alias("power"),
        ]
    )

    # Кодируем тип оборудования (L=0, M=1, H=2)
    le = LabelEncoder()
    le.fit(X["type"].to_numpy())  # только для получения маппинга классов
    mapping = {label: idx for idx, label in enumerate(le.classes_)}

    X = X.with_columns(
        pl.col("type").replace_strict(mapping, return_dtype=pl.Int64).alias("type")
    )

    # Конвертируем в numpy для sklearn/xgboost
    X_np = X.to_numpy()
    y_np = y.to_numpy().astype(int)

    # 3. Разделение на обучающую и тестовую выборки
    X_train, X_test, y_train, y_test = train_test_split(
        X_np, y_np, test_size=0.2, random_state=42, stratify=y_np
    )

    # 4. Инициализация и обучение XGBoost
    # Настраиваем модель так, чтобы она выдавала откалиброванную вероятность
    model = XGBClassifier(
        n_estimators=150,
        learning_rate=0.03,
        max_depth=5,
        # scale_pos_weight помогает при сильном дисбалансе классов (всего ~3% поломок)
        scale_pos_weight=(len(y_train) - y_train.sum()) / y_train.sum(),
        random_state=42,
        eval_metric="logloss",
    )

    model.fit(X_train, y_train)

    # 5. Получение вероятности P (от 0 до 1)
    probabilities = model.predict_proba(X_test)[:, 1]

    # 6. Проверка качества ранжирования вероятностей
    print(f"ROC-AUC Score: {roc_auc_score(y_test, probabilities):.4f}")
    print(
        f"PR-AUC Score (Average Precision): {average_precision_score(y_test, probabilities):.4f}"
    )

    if input("Save model to file? (y/N): ") == "y":
        fname = "model.ubjson"
        model.save_model(fname=fname)
        print(f"Saved model to {fname}")
    else:
        print("Model was not saved")


if __name__ == "__main__":
    main()
