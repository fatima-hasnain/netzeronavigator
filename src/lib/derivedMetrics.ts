import { jToKwh } from './volumeConversion'
import type { TfModel } from '../types/manifest'

export interface SurrogateOutputJ {
  HEATING_DEMAND: number
  COOLING_DEMAND: number
  HEATING_NG: number
  HEATING_OTHER: number
  HEATING_ELEC: number
  COOLING_ELEC: number
}

/**
 * Client-side approximations aligned with manifest `derived-output` notes (20200224).
 * All energies in J; `floorM2` from exterior context; intensities in kgCO2/kWh; $/kWh.
 *
 * The "in J" assumption is trusted, not verified here: `outputsRecordToJ` below just
 * reads whichever prediction values already carry the HEATING_DEMAND/COOLING_DEMAND/etc
 * ids — it doesn't check what unit those predictions are actually expressed in. The
 * real check lives upstream, in `supportsDerived`/`isJoules` (modelDisplay.ts), which
 * only lets this run when the manifest *declares* each output's `units` as `"J"`. That
 * declaration is reliable for 20200224 and the other hand-exported models, but for the
 * 280-model reconstructed archetype sweep it is exactly one of the open items flagged
 * in their recovery profile ("Output column order and units need confirmation") — a
 * unit label recovered alongside an unverified scaler, not something physically
 * confirmed. None of those 280 are `status: available` yet, so this path can't run for
 * them today; if one is ever promoted to available without independently confirming its
 * output units, `isJoules` would trust the manifest's "J" label and this function would
 * silently compute TEDI/CEDI/EUI/GHGI/cost from values that may not be joules at all.
 */
export function computeDerivedMetrics(
  out: SurrogateOutputJ,
  context: {
    FLOOR_AREA: number
    GHG_INTENSITY_NG: number
    GHG_INTENSITY_OTHER: number
    GHG_INTENSITY_GRID: number
    FUEL_PRICE_NG: number
    FUEL_PRICE_OTHER: number
    FUEL_PRICE_GRID: number
  },
): { TEDI: number; CEDI: number; EUI: number; GHGI: number; OPERATING_COST: number } {
  const f = context.FLOOR_AREA
  if (!f || f <= 0 || !Number.isFinite(f)) {
    return {
      TEDI: Number.NaN,
      CEDI: Number.NaN,
      EUI: Number.NaN,
      GHGI: Number.NaN,
      OPERATING_COST: Number.NaN,
    }
  }

  const kwh = (j: number) => jToKwh(j)
  const sumEndUsesJ =
    out.HEATING_DEMAND +
    out.COOLING_DEMAND +
    out.HEATING_NG +
    out.HEATING_OTHER +
    out.HEATING_ELEC +
    out.COOLING_ELEC

  const TEDI = kwh(out.HEATING_DEMAND) / f
  const CEDI = kwh(out.COOLING_DEMAND) / f
  const EUI = kwh(sumEndUsesJ) / f

  const ngKwh = kwh(out.HEATING_NG)
  const othKwh = kwh(out.HEATING_OTHER)
  const elecKwh = kwh(out.HEATING_ELEC + out.COOLING_ELEC)

  const ghg_t =
    ngKwh * context.GHG_INTENSITY_NG +
    othKwh * context.GHG_INTENSITY_OTHER +
    elecKwh * context.GHG_INTENSITY_GRID
  const GHGI = ghg_t / f

  const cost_t =
    ngKwh * context.FUEL_PRICE_NG +
    othKwh * context.FUEL_PRICE_OTHER +
    elecKwh * context.FUEL_PRICE_GRID
  const OPERATING_COST = cost_t / f

  return { TEDI, CEDI, EUI, GHGI, OPERATING_COST }
}

export function outputsRecordToJ(o: Record<string, number>): SurrogateOutputJ | null {
  const g = (k: keyof SurrogateOutputJ) => o[k]
  if (
    g('HEATING_DEMAND') === undefined ||
    g('COOLING_DEMAND') === undefined ||
    g('HEATING_NG') === undefined ||
    g('HEATING_OTHER') === undefined ||
    g('HEATING_ELEC') === undefined ||
    g('COOLING_ELEC') === undefined
  ) {
    return null
  }
  return {
    HEATING_DEMAND: g('HEATING_DEMAND'),
    COOLING_DEMAND: g('COOLING_DEMAND'),
    HEATING_NG: g('HEATING_NG'),
    HEATING_OTHER: g('HEATING_OTHER'),
    HEATING_ELEC: g('HEATING_ELEC'),
    COOLING_ELEC: g('COOLING_ELEC'),
  }
}

export function contextRecordForDerived(
  ctx: Record<string, number | string | undefined>,
): {
  FLOOR_AREA: number
  GHG_INTENSITY_NG: number
  GHG_INTENSITY_OTHER: number
  GHG_INTENSITY_GRID: number
  FUEL_PRICE_NG: number
  FUEL_PRICE_OTHER: number
  FUEL_PRICE_GRID: number
} {
  const n = (k: string) => {
    const v = ctx[k]
    if (v === undefined || v === null) {
      return Number.NaN
    }
    return typeof v === 'number' && Number.isFinite(v) ? v : Number(v)
  }
  return {
    FLOOR_AREA: n('FLOOR_AREA'),
    GHG_INTENSITY_NG: n('GHG_INTENSITY_NG'),
    GHG_INTENSITY_OTHER: n('GHG_INTENSITY_OTHER'),
    GHG_INTENSITY_GRID: n('GHG_INTENSITY_GRID'),
    FUEL_PRICE_NG: n('FUEL_PRICE_NG'),
    FUEL_PRICE_OTHER: n('FUEL_PRICE_OTHER'),
    FUEL_PRICE_GRID: n('FUEL_PRICE_GRID'),
  }
}

/**
 * Surrogate `values` do not always include `FLOOR_AREA` / price fields (not in
 * tensor for all manifests). Use numeric defaults from the active `tf-model`.
 */
export function getNumericExteriorContext(
  tfModel: TfModel,
): Record<string, number> {
  const m: Record<string, number> = {}
  for (const f of tfModel.features ?? []) {
    if (f.kind !== 'exterior-context') continue
    const d = f.default
    if (typeof d === 'number' && Number.isFinite(d)) {
      m[f.feature.id] = d
    } else if (typeof d === 'string') {
      const n = Number(d)
      if (Number.isFinite(n)) m[f.feature.id] = n
    }
  }
  return m
}

/**
 * Build context for `computeDerivedMetrics` from the active model + (optional) tensor
 * `values` that may override a subset of numeric fields.
 */
export function mergeDerivedContext(
  tfModel: TfModel,
  values: Record<string, number>,
): Record<string, number | string | undefined> {
  return { ...getNumericExteriorContext(tfModel), ...values }
}
