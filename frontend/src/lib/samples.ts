type Sample = Record<string, string>

type Scenario =
   | 'normal'
   | 'near_failure'
   | 'twf'
   | 'hdf'
   | 'pwf_low'
   | 'pwf_high'
   | 'osf'

type ProductType = '0' | '1' | '2'

// L = 0, M = 1, H = 2
const TYPES: ProductType[] = ['0', '1', '2']

const TYPE_WEIGHTS = [0.5, 0.3, 0.2]

// Пороговые значения OSF из AI4I 2020
const OSF_LIMITS: Record<ProductType, number> = {
   '0': 11000,
   '1': 12000,
   '2': 13000,
}

// Демонстрационное распределение сценариев.
// Оно намеренно отличается от частоты отказов в датасете,
// чтобы на UI можно было увидеть разные уровни риска.
const SCENARIOS: { name: Scenario; weight: number }[] = [
   { name: 'normal', weight: 0.55 },
   { name: 'near_failure', weight: 0.2 },
   { name: 'twf', weight: 0.07 },
   { name: 'hdf', weight: 0.05 },
   { name: 'pwf_low', weight: 0.04 },
   { name: 'pwf_high', weight: 0.04 },
   { name: 'osf', weight: 0.05 },
]

const rand = (min: number, max: number): number =>
   Math.random() * (max - min) + min

const normal = (mean: number, std: number): number => {
   const u1 = Math.max(Math.random(), Number.EPSILON)
   const u2 = Math.random()

   const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)

   return mean + z * std
}

const clamp = (value: number, min: number, max: number): number =>
   Math.min(Math.max(value, min), max)

const round = (value: number, digits = 1): number =>
   Number(value.toFixed(digits))

const pickWeighted = <T>(
   items: readonly T[],
   weights: readonly number[],
): T => {
   const total = weights.reduce((sum, weight) => sum + weight, 0)
   let value = Math.random() * total

   for (let i = 0; i < items.length; i++) {
      value -= weights[i]!

      if (value <= 0) {
         return items[i]!
      }
   }

   return items[items.length - 1]!
}

const pickType = (): ProductType => pickWeighted(TYPES, TYPE_WEIGHTS)

const pickScenario = (): Scenario =>
   pickWeighted(
      SCENARIOS.map(({ name }) => name),
      SCENARIOS.map(({ weight }) => weight),
   )

const format = (value: number, digits = 1): string => value.toFixed(digits)

/**
 * Генерирует базовые характеристики станка.
 * Значения приближены к статистическому распределению AI4I 2020.
 */
function createBaseSample(type: ProductType): Sample {
   const air = clamp(normal(300, 2), 295, 305)

   const process = clamp(air + normal(10, 1), air + 5, air + 15)

   const torque = clamp(normal(40, 10), 3, 80)

   const rpm = clamp(normal(1538, 179), 1168, 2886)

   // Износ инструмента: 0–250 минут.
   const toolWear = Math.floor(rand(0, 251))

   return {
      type,
      air_temperature_k: format(air),
      process_temperature_k: format(process),
      rotational_speed_rpm: String(Math.round(rpm)),
      torque_nm: format(torque),
      tool_wear_min: String(toolWear),
   }
}

/**
 * Сценарий без явных условий отказа.
 */
function normalScenario(sample: Sample): Sample {
   sample.air_temperature_k = format(normal(300, 2))

   const air = Number(sample.air_temperature_k)

   sample.process_temperature_k = format(air + clamp(normal(10, 0.9), 9.2, 12))

   sample.rotational_speed_rpm = String(
      Math.round(clamp(normal(1600, 170), 1450, 2100)),
   )

   sample.torque_nm = format(clamp(normal(37, 7), 20, 48))

   sample.tool_wear_min = String(Math.floor(rand(0, 170)))

   return sample
}

/**
 * Пограничный случай:
 * признаки находятся рядом с условиями отказа,
 * но не обязательно пересекают порог.
 */
function nearFailureScenario(sample: Sample): Sample {
   const air = Number(sample.air_temperature_k)

   const variant = Math.random()

   if (variant < 0.33) {
      // Износ около диапазона TWF.
      sample.tool_wear_min = String(Math.round(rand(185, 205)))
   } else if (variant < 0.66) {
      // Температурная разница около 8.6 K.
      sample.process_temperature_k = format(air + rand(8.6, 9.2))

      sample.rotational_speed_rpm = String(Math.round(rand(1380, 1480)))
   } else {
      // Момент около границы OSF.
      const torque = rand(48, 55)
      const limit = OSF_LIMITS[sample.type as ProductType]

      sample.torque_nm = format(torque)

      sample.tool_wear_min = String(
         Math.floor((limit * rand(0.85, 0.99)) / torque),
      )
   }

   return sample
}

/**
 * Tool Wear Failure.
 * Износ инструмента находится в диапазоне 200–240 минут.
 */
function twfScenario(sample: Sample): Sample {
   sample.tool_wear_min = String(Math.round(rand(205, 240)))

   sample.torque_nm = format(rand(25, 40))

   sample.rotational_speed_rpm = String(Math.round(rand(1450, 1750)))

   return sample
}

/**
 * Heat Dissipation Failure.
 * Разница температур < 8.6 K и RPM < 1380.
 */
function hdfScenario(sample: Sample): Sample {
   const air = Number(sample.air_temperature_k)

   sample.process_temperature_k = format(air + rand(7.5, 8.5))

   sample.rotational_speed_rpm = String(Math.round(rand(1150, 1370)))

   sample.torque_nm = format(rand(35, 45))

   sample.tool_wear_min = String(Math.round(rand(20, 150)))

   return sample
}

/**
 * Power Failure.
 * Мощность = Torque * RPM * 2π / 60.
 * Отказ при мощности < 3500 W или > 9000 W.
 */
function pwfScenario(sample: Sample, direction: 'low' | 'high'): Sample {
   if (direction === 'low') {
      sample.torque_nm = format(rand(15, 22))

      sample.rotational_speed_rpm = String(Math.round(rand(1100, 1400)))
   } else {
      sample.torque_nm = format(rand(65, 78))

      sample.rotational_speed_rpm = String(Math.round(rand(1250, 1500)))
   }

   sample.tool_wear_min = String(Math.round(rand(10, 100)))

   return sample
}

/**
 * Overstrain Failure.
 * Tool wear * torque превышает порог для конкретного типа изделия.
 */
function osfScenario(sample: Sample): Sample {
   const type = sample.type as ProductType
   const limit = OSF_LIMITS[type]

   const torque = rand(58, 78)
   const wear = Math.ceil((limit * rand(1.03, 1.15)) / torque)

   sample.torque_nm = format(torque)

   sample.tool_wear_min = String(clamp(wear, 1, 250))

   sample.rotational_speed_rpm = String(Math.round(rand(1350, 1650)))

   return sample
}

export function randomSample(): Sample {
   const type = pickType()
   const scenario = pickScenario()

   const sample = createBaseSample(type)

   switch (scenario) {
      case 'normal':
         return normalScenario(sample)

      case 'near_failure':
         return nearFailureScenario(sample)

      case 'twf':
         return twfScenario(sample)

      case 'hdf':
         return hdfScenario(sample)

      case 'pwf_low':
         return pwfScenario(sample, 'low')

      case 'pwf_high':
         return pwfScenario(sample, 'high')

      case 'osf':
         return osfScenario(sample)
   }
}
