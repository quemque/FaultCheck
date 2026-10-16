type Sample = Record<string, string>

const rand = (min: number, max: number, digits = 0) =>
   (Math.random() * (max - min) + min).toFixed(digits)

const pick = <T>(arr: readonly T[]): T =>
   arr[Math.floor(Math.random() * arr.length)]!

export function randomSample(): Sample {
   const type = pick(['0', '1', '2'] as const)
   const air = +rand(297.5, 300.5, 1)

   const zone = pick([
      'safe', // ~2% – 15%
      'mild_risk', // ~20% – 35%
      'medium_risk', // ~40% – 55%
      'high_risk', // ~60% – 75%
      'critical', // ~80% – 98%
   ] as const)

   switch (zone) {
      case 'safe': {
         return {
            type,
            air_temperature_k: air.toFixed(1),
            process_temperature_k: (air + +rand(10.2, 11.2, 1)).toFixed(1),
            rotational_speed_rpm: rand(1500, 1650),
            torque_nm: rand(35, 42, 1),
            tool_wear_min: rand(10, 70),
         }
      }
      case 'mild_risk': {
         return {
            type,
            air_temperature_k: air.toFixed(1),
            process_temperature_k: (air + +rand(9.6, 10.3, 1)).toFixed(1),
            rotational_speed_rpm: rand(1440, 1540),
            torque_nm: rand(39, 46, 1),
            tool_wear_min: rand(182, 202),
         }
      }
      case 'medium_risk': {
         const diff = +rand(8.7, 8.9, 1)
         return {
            type,
            air_temperature_k: air.toFixed(1),
            process_temperature_k: (air + diff).toFixed(1),
            rotational_speed_rpm: rand(1390, 1430),
            torque_nm: rand(44, 50, 1),
            tool_wear_min: rand(110, 150),
         }
      }
      case 'high_risk': {
         const torque = +rand(54, 60, 1)
         const targetProduct =
            type === '0' ? 10600 : type === '1' ? 11600 : 12400
         const wear = Math.round(targetProduct / torque)

         return {
            type,
            air_temperature_k: air.toFixed(1),
            process_temperature_k: (air + +rand(9.2, 9.8, 1)).toFixed(1),
            rotational_speed_rpm: rand(1360, 1440),
            torque_nm: torque.toFixed(1),
            tool_wear_min: String(Math.min(wear, 210)),
         }
      }
      case 'critical': {
         const isThermal = Math.random() > 0.5
         return {
            type,
            air_temperature_k: air.toFixed(1),
            process_temperature_k: (
               air + (isThermal ? +rand(7.2, 8.1, 1) : +rand(9.0, 10.0, 1))
            ).toFixed(1),
            rotational_speed_rpm: isThermal
               ? rand(1220, 1340)
               : rand(1200, 1320),
            torque_nm: isThermal ? rand(46, 54, 1) : rand(65, 74, 1),
            tool_wear_min: rand(215, 245),
         }
      }
   }
}
