import plotly.express as px
import plotly.graph_objects as go
import polars as pl
from plotly.subplots import make_subplots

from analysis import parse_csv

CHART_THEME = {
    "font": {
        "size": 36,
    },
    "title_font": {
        "size": 48,
        "weight": "bold",
    },
    "autosize": True,
    "height": None,
    "width": None,
    "margin": {"l": 60, "r": 60, "t": 180, "b": 60},
}
COLOR_OK, COLOR_FAIL = "#2E86DE", "#E74C3C"
NUM_COLS = [
    "air_temperature_k",
    "process_temperature_k",
    "rotational_speed_rpm",
    "torque_nm",
    "tool_wear_min",
]
FAIL_COLS = ["twf", "hdf", "pwf", "osf", "rnf"]
FAIL_RU = {
    "twf": "Износ инструмента (TWF)",
    "hdf": "Перегрев (HDF)",
    "pwf": "Сбой мощности (PWF)",
    "osf": "Перегрузка (OSF)",
    "rnf": "Случайный отказ (RNF)",
}


def _ensure_bool(df: pl.DataFrame, col: str = "machine_failure") -> pl.DataFrame:
    """Приводит булев столбец к pl.Boolean и убирает null."""
    return df.drop_nulls(col).with_columns(pl.col(col).cast(pl.Boolean))


# ------------------------------------------------------------------
# 1. Баланс классов machine_failure
# ------------------------------------------------------------------
def fig_balance(df: pl.DataFrame) -> go.Figure:
    counts = (
        _ensure_bool(df)
        .group_by("machine_failure")
        .len()
        .with_columns(
            pl.when(pl.col("machine_failure"))
            .then(pl.lit("Отказ"))
            .otherwise(pl.lit("Норма"))
            .alias("label")
        )
        .select("label", "len")
    )

    fig = px.pie(
        counts.to_pandas(),
        names="label",
        values="len",
        hole=0.45,
        color="label",
        color_discrete_map={"Норма": COLOR_OK, "Отказ": COLOR_FAIL},
        title="Сколько деталей сломались?<br>"
        "<sup>Отказов очень мало — данные несбалансированы</sup>",
    )
    fig.update_traces(
        textinfo="percent+label+value",
        textposition="inside",
        insidetextorientation="horizontal",
    )
    return fig


# ------------------------------------------------------------------
# 2. Сколько отказов каждого типа
# ------------------------------------------------------------------
def fig_failure_types(df: pl.DataFrame) -> go.Figure:
    counts = (
        df.select([pl.col(c).sum().alias(c) for c in FAIL_COLS])
        .unpivot(variable_name="failure", value_name="count")
        .with_columns(
            pl.col("failure")
            .replace_strict(FAIL_RU, return_dtype=pl.String)
            .alias("failure_ru")
        )
        .sort("count", descending=False)
    )

    fig = px.bar(
        counts.to_pandas(),
        x="count",
        y="failure_ru",
        orientation="h",
        text="count",
        color="count",
        color_continuous_scale="Reds",
        title="Какие бывают отказы и как часто<br>"
        "<sup>HDF (перегрев) и OSF (перегрузка) — самые частые</sup>",
    )
    fig.update_traces(textposition="outside", cliponaxis=False)
    fig.update_layout(
        coloraxis_showscale=False,
        xaxis_title="Количество случаев",
        yaxis_title="",
    )
    return fig


# ------------------------------------------------------------------
# 3. Доля деталей по типу (L/M/H)
# ------------------------------------------------------------------
def fig_product_mix(df: pl.DataFrame) -> go.Figure:
    counts = df.group_by("type").len().sort("type")

    fig = px.bar(
        counts.to_pandas(),
        x="type",
        y="len",
        text="len",
        color="type",
        color_discrete_sequence=px.colors.qualitative.Set2,
        title="Распределение деталей по типу (L / M / H)<br>"
        "<sup>L — самые частые, H — самые редкие</sup>",
    )
    fig.update_traces(textposition="outside", cliponaxis=False)
    fig.update_layout(
        showlegend=False,
        xaxis_title="Тип детали",
        yaxis_title="Количество",
    )
    return fig


# ------------------------------------------------------------------
# 4. Распределения пяти числовых признаков
# ------------------------------------------------------------------
def fig_numeric_distributions(df: pl.DataFrame) -> go.Figure:
    titles = {
        "air_temperature_k": "Температура воздуха, K",
        "process_temperature_k": "Температура процесса, K",
        "rotational_speed_rpm": "Скорость вращения, об/мин",
        "torque_nm": "Крутящий момент, Н·м",
        "tool_wear_min": "Износ инструмента, мин",
    }
    fig = make_subplots(
        rows=2,
        cols=3,
        subplot_titles=[titles[c] for c in NUM_COLS],
        horizontal_spacing=0.10,
        vertical_spacing=0.18,
    )

    for i, c in enumerate(NUM_COLS):
        r, col = divmod(i, 3)
        values = df.select(pl.col(c).drop_nulls()).to_series().to_numpy()
        fig.add_trace(
            go.Histogram(x=values, nbinsx=50, marker_color=COLOR_OK, name=titles[c]),
            row=r + 1,
            col=col + 1,
        )

    fig.update_layout(
        title="Как распределены числовые признаки<br>"
        "<sup>Форма «колокола» = большинство значений около среднего</sup>",
        showlegend=False,
        bargap=0.05,
    )
    fig.update_xaxes(showgrid=False)
    fig.update_yaxes(title_text="Частота", showgrid=True, gridcolor="#EEEEEE")
    return fig


# ------------------------------------------------------------------
# 5. Износ инструмента vs отказ (boxplot)
# ------------------------------------------------------------------
def fig_toolwear_vs_failure(df: pl.DataFrame) -> go.Figure:
    prepared = (
        _ensure_bool(df)
        .with_columns(
            pl.when(pl.col("machine_failure"))
            .then(pl.lit("Отказ"))
            .otherwise(pl.lit("Норма"))
            .alias("machine_failure_ru")
        )
        .select("machine_failure_ru", "tool_wear_min")
    )

    fig = px.box(
        prepared.to_pandas(),
        x="machine_failure_ru",
        y="tool_wear_min",
        color="machine_failure_ru",
        color_discrete_map={"Норма": COLOR_OK, "Отказ": COLOR_FAIL},
        points="outliers",
        title="Износ инструмента у сломанных и целых деталей<br>"
        "<sup>У отказов медиана износа заметно выше</sup>",
    )
    fig.update_layout(
        showlegend=False,
        xaxis_title="Состояние",
        yaxis_title="Износ инструмента, мин",
    )
    return fig


# ------------------------------------------------------------------
# 6. Крутящий момент vs Скорость вращения
# ------------------------------------------------------------------
def fig_torque_vs_speed(df: pl.DataFrame) -> go.Figure:
    prepared = (
        _ensure_bool(df)
        .with_columns(
            pl.when(pl.col("machine_failure"))
            .then(pl.lit("Отказ"))
            .otherwise(pl.lit("Норма"))
            .alias("machine_failure_ru")
        )
        .select("rotational_speed_rpm", "torque_nm", "machine_failure_ru", "type")
    )

    fig = px.scatter(
        prepared.to_pandas(),
        x="rotational_speed_rpm",
        y="torque_nm",
        color="machine_failure_ru",
        symbol="type",
        color_discrete_map={"Норма": COLOR_OK, "Отказ": COLOR_FAIL},
        category_orders={"machine_failure_ru": ["Норма", "Отказ"]},
        opacity=0.6,
        title="Крутящий момент vs Скорость вращения<br>"
        "<sup>Отказы (красные) — в «хвостах»: мало оборотов + большой момент</sup>",
    )
    fig.update_traces(marker={"size": 5, "line": {"width": 0}})

    for tr in fig.data:
        if tr.legendgroup in ("L", "M", "H"):
            tr.update(legend="legend2")

    fig.update_layout(
        legend={
            "title": "Состояние",
            "x": 1.02,
            "xanchor": "left",
            "y": 1.0,
            "yanchor": "top",
            "itemsizing": "constant",
        },
        legend2={
            "title": "Тип",
            "x": 1.02,
            "xanchor": "left",
            "y": 0.55,
            "yanchor": "top",
            "itemsizing": "constant",
        },
        xaxis_title="Скорость вращения, об/мин",
        yaxis_title="Крутящий момент, Н·м",
    )
    return fig


# ------------------------------------------------------------------
# 7. Температура воздуха vs процесса
# ------------------------------------------------------------------
def fig_temp_pair(df: pl.DataFrame) -> go.Figure:
    prepared = (
        _ensure_bool(df)
        .with_columns(
            pl.when(pl.col("machine_failure"))
            .then(pl.lit("Отказ"))
            .otherwise(pl.lit("Норма"))
            .alias("machine_failure_ru")
        )
        .select("air_temperature_k", "process_temperature_k", "machine_failure_ru")
    )

    fig = px.scatter(
        prepared.to_pandas(),
        x="air_temperature_k",
        y="process_temperature_k",
        color="machine_failure_ru",
        color_discrete_map={"Норма": COLOR_OK, "Отказ": COLOR_FAIL},
        category_orders={"machine_failure_ru": ["Норма", "Отказ"]},
        opacity=0.5,
        title="Температура воздуха vs Температура процесса<br>"
        "<sup>Точки над линией «+10K» — риск перегрева (HDF)</sup>",
    )
    fig.update_traces(marker={"size": 5, "line": {"width": 0}})

    # Опорная линия: process = air + 10 (в Polars считаем границы)
    bounds = df.select(
        pl.col("air_temperature_k").min().alias("xmin"),
        pl.col("air_temperature_k").max().alias("xmax"),
    ).row(0)
    xs = [bounds[0], bounds[1]]
    ys = [x + 10 for x in xs]

    fig.add_trace(
        go.Scatter(
            x=xs,
            y=ys,
            mode="lines",
            line={"color": "black", "dash": "dash", "width": 1.5},
            name="Порог +10 K",
            hoverinfo="skip",
        )
    )

    fig.update_layout(
        legend={"title": "", "x": 1.02, "xanchor": "left", "y": 1, "yanchor": "top"},
        xaxis_title="Температура воздуха, K",
        yaxis_title="Температура процесса, K",
    )
    return fig


# ------------------------------------------------------------------
# 8. Температура процесса по типам деталей
# ------------------------------------------------------------------
def fig_process_temp_by_type(df: pl.DataFrame) -> go.Figure:
    prepared = df.select("type", "process_temperature_k")

    fig = px.violin(
        prepared.to_pandas(),
        x="type",
        y="process_temperature_k",
        color="type",
        box=True,
        points=False,
        color_discrete_sequence=px.colors.qualitative.Set2,
        title="Температура процесса по типам деталей<br>"
        "<sup>Тип H работает заметно «горячее»</sup>",
    )
    fig.update_layout(
        showlegend=False,
        xaxis_title="Тип детали",
        yaxis_title="Температура процесса, K",
    )
    return fig


# ------------------------------------------------------------------
# 9. Корреляционная матрица
# ------------------------------------------------------------------
def fig_correlation(df: pl.DataFrame) -> go.Figure:
    cols = NUM_COLS + FAIL_COLS + ["machine_failure"]
    labels = {
        "air_temperature_k": "t воздуха",
        "process_temperature_k": "t процесса",
        "rotational_speed_rpm": "обороты",
        "torque_nm": "момент",
        "tool_wear_min": "износ",
        "machine_failure": "ОТКАЗ",
        **FAIL_RU,
    }

    # Polars: корреляция через pl.corr по всем парам
    base = df.select([pl.col(c).cast(pl.Float64) for c in cols])

    matrix = []
    for c1 in cols:
        row = []
        for c2 in cols:
            r = base.select(pl.corr(c1, c2)).item()
            row.append(r)
        matrix.append(row)

    corr_df = (
        pl.DataFrame(matrix, schema=cols, orient="row")
        .with_columns(pl.Series("__idx", cols))
        .select(["__idx"] + cols)
    )

    # переименование через Polars
    renamed = corr_df.rename({c: labels[c] for c in cols})
    renamed = renamed.rename({"__idx": ""})

    fig = px.imshow(
        renamed.to_pandas().set_index(""),
        text_auto=".2f",
        aspect="auto",
        color_continuous_scale="RdBu_r",
        zmin=-1,
        zmax=1,
        title="Насколько признаки связаны друг с другом<br>"
        "<sup>Красное = сильная связь, синее = обратная, белое = нет</sup>",
    )
    fig.update_traces(textfont_size=10)
    fig.update_layout(
        coloraxis_colorbar={"title": "r", "thickness": 14},
    )
    return fig


# ------------------------------------------------------------------
# 10. Доля отказов по типу детали
# ------------------------------------------------------------------
def fig_failure_rate_by_type(df: pl.DataFrame) -> go.Figure:
    rate = (
        _ensure_bool(df)
        .group_by("type")
        .agg(
            [
                pl.col("machine_failure").mean().alias("rate"),
                pl.len().alias("n"),
            ]
        )
        .with_columns((pl.col("rate") * 100).round(2).alias("rate_pct"))
        .sort("type")
    )

    fig = px.bar(
        rate.to_pandas(),
        x="type",
        y="rate_pct",
        text="rate_pct",
        color="type",
        color_discrete_sequence=px.colors.qualitative.Set2,
        title="Какой процент деталей ломается в каждом типе<br>"
        "<sup>Тип L ломается чаще остальных</sup>",
    )
    fig.update_traces(texttemplate="%{text}%", textposition="outside", cliponaxis=False)
    fig.update_layout(
        showlegend=False,
        xaxis_title="Тип детали",
        yaxis_title="Доля отказов, %",
        yaxis_range=[0, rate["rate_pct"].max() * 1.25],
    )
    return fig


# ------------------------------------------------------------------
# 11. «Карта риска»: износ × момент, отдельно для нормы и отказа
# ------------------------------------------------------------------
def fig_risk_map(df: pl.DataFrame) -> go.Figure:
    prepared = (
        _ensure_bool(df)
        .with_columns(
            pl.when(pl.col("machine_failure"))
            .then(pl.lit("Отказ"))
            .otherwise(pl.lit("Норма"))
            .alias("machine_failure_ru")
        )
        .select("tool_wear_min", "torque_nm", "machine_failure_ru")
    )

    fig = px.density_heatmap(
        prepared.to_pandas(),
        x="tool_wear_min",
        y="torque_nm",
        facet_col="machine_failure_ru",
        category_orders={"machine_failure_ru": ["Норма", "Отказ"]},
        nbinsx=40,
        nbinsy=40,
        color_continuous_scale="Viridis",
        title="Где чаще случаются отказы: износ × момент<br>"
        "<sup>Справа (отказы) видно «горячее пятно» при большом износе и моменте</sup>",
    )
    fig.update_layout(
        coloraxis_colorbar={"title": "точек", "thickness": 14},
    )
    fig.for_each_annotation(lambda a: a.update(text=a.text.split("=")[-1]))
    return fig


def main():
    with open("dataset.csv", encoding="utf-8-sig") as file:
        df = parse_csv(file.read(), separator=",")

    df = df.with_columns(
        pl.col("machine_failure")
        .replace_strict({True: "Отказ", False: "Норма"}, return_dtype=pl.String)
        .alias("machine_failure_ru")
    )

    figures = {
        "balance": fig_balance(df),
        "failure_types": fig_failure_types(df),
        "product_mix": fig_product_mix(df),
        "numeric_distributions": fig_numeric_distributions(df),
        "toolwear_vs_failure": fig_toolwear_vs_failure(df),
        "torque_vs_speed": fig_torque_vs_speed(df),
        "temp_pair": fig_temp_pair(df),
        "process_temp_by_type": fig_process_temp_by_type(df),
        "correlation": fig_correlation(df),
        "failure_rate_by_type": fig_failure_rate_by_type(df),
        "risk_map": fig_risk_map(df),
    }
    for filename, fig in figures.items():
        fig.update_layout(**CHART_THEME)
        with open(f"charts/{filename}.html", mode="w", encoding="utf-8") as file:
            file.write(fig.to_html())


if __name__ == "__main__":
    main()
