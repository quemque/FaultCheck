export type RiskLevel = {
   key: 'low' | 'medium' | 'high' | 'critical'
   hint: string
   box: string
   text: string
}
export type Values = Record<string, string>

export type ModeKey = 'twf' | 'hdf' | 'pwf' | 'osf'

export type ModeResult = {
   probability: number
   /** решение ML-модели по порогу */
   predicted: boolean
   /** сработало физическое правило */
   rule_triggered: boolean
   /** итог: показывать ли этот тип отказа как причину */
   active: boolean
   /** ключи полей формы, которые подсвечиваем */
   sensors: string[]
}

export type AnalysisResponse = {
   model: 'xgb' | 'tree'
   failure_probability: number
   is_failure: boolean
   threshold: number
   modes: Record<ModeKey, ModeResult>
   highlighted_sensors: string[]
   unexplained: boolean
}

export type ModelKind = AnalysisResponse['model']

export type Result =
   | { kind: 'ok'; data: AnalysisResponse }
   | { kind: 'error'; message: string }
   | null

export type TargetKey = 'machine_failure' | ModeKey

export type MetricKey =
   | 'pr_auc'
   | 'roc_auc'
   | 'r_precision'
   | 'precision'
   | 'recall'
   | 'f2'
   | 'g_mean'
   | 'mcc'
   | 'kappa'

/** Строка метрик на отложенной выборке (artifacts/metrics.json) */
export type HoldoutRow = { target: TargetKey; model: ModelKind } & Record<
   | MetricKey
   | 'specificity'
   | 'f1'
   | 'balanced_accuracy'
   | 'threshold'
   | 'tn'
   | 'fp'
   | 'fn'
   | 'tp',
   number
>

/** Строка метрик кросс-валидации (artifacts/cv_metrics.json) */
export type CvRow = { target: TargetKey; model: ModelKind } & Record<
   `${MetricKey}_mean` | `${MetricKey}_std`,
   number
>

export type MetricsResponse = { holdout: HoldoutRow[]; cv: CvRow[] }
