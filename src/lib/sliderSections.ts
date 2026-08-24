import type { ManifestFeature } from '../types/manifest'

export const SLIDER_SECTIONS: { title: string; ids: Set<string> }[] = [
  {
    title: 'Envelope',
    ids: new Set([
      'WALL_INSULATION_THICKNESS',
      'ROOF_INSULATION_THICKNESS',
      'WINDOW_U_VALUE',
      'WINDOW_SHGC',
      'WINDOW_TO_WALL_RATIO',
      'FLOOR_MASS_THICKNESS',
      'WALL_MASS_THICKNESS',
      'HORIZONTAL_SHADING',
    ]),
  },
  {
    title: 'HVAC & Mechanical',
    ids: new Set([
      'FAN_POWER',
      'AIR_SIDE_CONDITIONING_RATIO',
      'HEATING_PLANT_FUEL_ELEC',
      'HEATING_FUEL_NG_OTHER',
      'HEATING_PLANT_PERFORMANCE_FUEL',
      'SENSIBLE_HEAT_RECOVERY',
      'LATENT_HEAT_RECOVERY',
    ]),
  },
  {
    title: 'Internal Loads',
    ids: new Set([
      'OCCUPANCY',
      'PLUG_LOADS',
      'SERVER_ROOM_LOADS',
      'LIGHTING_POWER_DENSITY',
      'DHW',
    ]),
  },
  {
    title: 'Comfort & Controls',
    ids: new Set([
      'COOLING_SETPOINT',
      'MIN_HUMIDITY_SETPOINT',
      'MAX_HUMIDITY_SETPOINT',
      'VENTILATION_EFFECTIVENESS_CLG',
      'VENTILATION_EFFECTIVENESS_HTG',
      'DAYLIGHTING_SENSORS',
    ]),
  },
  {
    title: 'Site & Geometry',
    ids: new Set(['ORIENTATION', 'BUILDING_STOREYS', 'INFILTRATION_RATE']),
  },
]

export function groupTensorInputs(
  features: ManifestFeature[],
): { title: string; items: ManifestFeature[] }[] {
  const byId = new Map(features.map((f) => [f.feature.id, f]))
  const used = new Set<string>()
  const groups: { title: string; items: ManifestFeature[] }[] = []

  for (const section of SLIDER_SECTIONS) {
    const items: ManifestFeature[] = []
    for (const id of section.ids) {
      const f = byId.get(id)
      if (f) {
        items.push(f)
        used.add(id)
      }
    }
    if (items.length) {
      groups.push({ title: section.title, items })
    }
  }

  const rest = features
    .filter((f) => !used.has(f.feature.id))
    .sort((a, b) => (a.tf?.position ?? 0) - (b.tf?.position ?? 0))
  if (rest.length) {
    groups.push({ title: 'Other', items: rest })
  }

  return groups
}
