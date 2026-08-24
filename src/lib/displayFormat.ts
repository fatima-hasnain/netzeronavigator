/**
 * Per-variable **display** decimal places (model still uses full precision).
 * See UI improvement spec §3.
 */
export function decimalPlacesForFeatureId(id: string): number {
  const m: Record<string, number> = {
    ORIENTATION: 1,
    WALL_INSULATION_THICKNESS: 3,
    ROOF_INSULATION_THICKNESS: 3,
    WINDOW_U_VALUE: 2,
    WINDOW_SHGC: 3,
    OCCUPANCY: 1,
    PLUG_LOADS: 1,
    LIGHTING_POWER_DENSITY: 1,
    SERVER_ROOM_LOADS: 0,
    DHW: 3,
    INFILTRATION_RATE: 3,
    VENTILATION_EFFECTIVENESS_CLG: 2,
    VENTILATION_EFFECTIVENESS_HTG: 2,
    COOLING_SETPOINT: 1,
    MIN_HUMIDITY_SETPOINT: 1,
    MAX_HUMIDITY_SETPOINT: 1,
    FAN_POWER: 3,
    AIR_SIDE_CONDITIONING_RATIO: 2,
    HEATING_PLANT_FUEL_ELEC: 2,
    HEATING_FUEL_NG_OTHER: 2,
    HEATING_PLANT_PERFORMANCE_FUEL: 2,
    WINDOW_TO_WALL_RATIO: 2,
    HORIZONTAL_SHADING: 3,
    DAYLIGHTING_SENSORS: 2,
    BUILDING_STOREYS: 0,
    SENSIBLE_HEAT_RECOVERY: 2,
    LATENT_HEAT_RECOVERY: 2,
    FLOOR_MASS_THICKNESS: 3,
    WALL_MASS_THICKNESS: 3,
  }
  return m[id] ?? 4
}

export function formatDisplayNumber(value: number, id: string): string {
  const dp = decimalPlacesForFeatureId(id)
  if (dp === 0) return String(Math.round(value))
  return value.toFixed(dp)
}

export function stepForFeatureId(id: string): string {
  const dp = decimalPlacesForFeatureId(id)
  if (dp === 0) return '1'
  return String(Math.pow(10, -dp))
}
