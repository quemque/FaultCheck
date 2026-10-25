import type { MetricKey, ModelKind, TargetKey } from '@/types'

export const TARGETS: { key: TargetKey; label: string; en: string }[] = [
   { key: 'machine_failure', label: 'Общий отказ', en: 'Machine failure' },
   { key: 'twf', label: 'Износ инструмента', en: 'Tool wear' },
   { key: 'hdf', label: 'Отвод тепла', en: 'Heat dissipation' },
   { key: 'pwf', label: 'Мощность', en: 'Power' },
   { key: 'osf', label: 'Перенапряжение', en: 'Overstrain' },
]

export const MODEL_LABELS: Record<ModelKind, string> = {
   xgb: 'XGBoost',
   tree: 'Дерево решений',
}

export const METRICS: { key: MetricKey; label: string; hint: string }[] = [
   {
      key: 'pr_auc',
      label: 'PR-AUC',
      hint: 'Площадь под кривой precision–recall. Главная метрика при дисбалансе классов, не зависит от порога.',
   },
   {
      key: 'roc_auc',
      label: 'ROC-AUC',
      hint: 'Насколько хорошо модель отделяет отказы от нормы по всем порогам. При сильном дисбалансе выглядит оптимистичнее PR-AUC.',
   },
   {
      key: 'r_precision',
      label: 'R-precision',
      hint: 'Доля реальных отказов среди топ-k самых рискованных примеров, где k — число реальных отказов.',
   },
   {
      key: 'precision',
      label: 'Precision',
      hint: 'Какая доля предсказанных отказов настоящая (чем выше, тем меньше ложных тревог).',
   },
   {
      key: 'recall',
      label: 'Recall',
      hint: 'Какая доля настоящих отказов найдена (чем выше, тем меньше пропусков).',
   },
   {
      key: 'f2',
      label: 'F2',
      hint: 'F-мера, где recall важнее precision: пропуск отказа хуже ложной тревоги.',
   },
   {
      key: 'g_mean',
      label: 'G-mean',
      hint: 'Корень из recall × specificity: баланс между найденными отказами и правильно распознанной нормой.',
   },
   {
      key: 'mcc',
      label: 'MCC',
      hint: 'Коэффициент корреляции Мэтьюса: учитывает все четыре клетки матрицы ошибок, от −1 до 1.',
   },
   {
      key: 'kappa',
      label: 'Kappa',
      hint: 'Каппа Коэна: согласие с реальностью сверх случайного угадывания.',
   },
]
