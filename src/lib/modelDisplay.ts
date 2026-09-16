import type { ManifestFeature, TfModel } from '../types/manifest'
import { t } from '../i18n/t'
import { formatEnergy, type EnergyDisplayUnit } from './volumeConversion'

export function featureLabel(f: ManifestFeature): string {
  return f['short-name'] || f['long-name'] || t(f.feature.id)
}
/** Trusts the manifest's declared `units`, does not verify the underlying values are
 * actually joules — see the caveat in derivedMetrics.ts about the reconstructed
 * archetype sweep, whose recovered unit labels are unconfirmed. */
export function isJoules(f: ManifestFeature | undefined): boolean {
  return f?.units?.toLowerCase() === 'j'
}
export function formatModelOutput(value: number, f: ManifestFeature, mode: EnergyDisplayUnit) {
  return isJoules(f) ? formatEnergy(value, mode, 'en-CA') : {
    text: Number.isFinite(value) ? value.toLocaleString('en-CA', { maximumSignificantDigits: 5 }) : '—',
    unit: f.units || '',
  }
}
export function supportsDerived(model: TfModel) {
  const required = ['HEATING_DEMAND', 'COOLING_DEMAND', 'HEATING_NG', 'HEATING_OTHER', 'HEATING_ELEC', 'COOLING_ELEC']
  return required.every(id => model.features.some(f => f.feature.id === id && f.kind === 'surrogate-output' && isJoules(f))) &&
    model.features.some(f => f.feature.id === 'FLOOR_AREA' && Number(f.default) > 0)
}
