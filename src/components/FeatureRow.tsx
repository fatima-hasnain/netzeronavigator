import type { ManifestFeature } from '../types/manifest'
import { t } from '../i18n/t'
import { formatDisplayNumber } from '../lib/displayFormat'
import { modelToDisplayFlow, isDhwId, isFlowPerM2 } from '../lib/inputModelDisplay'
import { normalizeUnitLabel } from '../lib/unitNormalize'

function formatDefault(value: unknown): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return String(value)
}

function trainingRangeText(f: ManifestFeature): string | null {
  const id = f.feature.id
  const tf = f.tf
  if (!tf) return null
  const tmin = tf['training-min']
  const tmax = tf['training-max']
  if (tmin === undefined && tmax === undefined) {
    return null
  }
  if (tmin === undefined || tmax === undefined) {
    return `${tmin ?? '…'} – ${tmax ?? '…'}`
  }
  if (!Number.isFinite(tmin) || !Number.isFinite(tmax)) {
    return `${tmin} – ${tmax}`
  }
  if (isDhwId(id) || isFlowPerM2(id)) {
    const a = modelToDisplayFlow(id, tmin)
    const b = modelToDisplayFlow(id, tmax)
    return `${formatDisplayNumber(a, id)} – ${formatDisplayNumber(b, id)}`
  }
  return `${formatDisplayNumber(tmin, id)} – ${formatDisplayNumber(tmax, id)}`
}

function defaultDisplay(f: ManifestFeature): string {
  if (f.default === undefined || f.default === null) return '—'
  const id = f.feature.id
  if (typeof f.default === 'number' && Number.isFinite(f.default)) {
    if (isDhwId(id) || isFlowPerM2(id)) {
      return formatDisplayNumber(modelToDisplayFlow(id, f.default), id)
    }
    return formatDisplayNumber(f.default, id)
  }
  if (typeof f.default === 'string') {
    const n = Number(f.default)
    if (Number.isFinite(n)) {
      if (isDhwId(id) || isFlowPerM2(id)) {
        return formatDisplayNumber(modelToDisplayFlow(id, n), id)
      }
      return formatDisplayNumber(n, id)
    }
  }
  return formatDefault(f.default)
}

export function FeatureRow({ feature }: { feature: ManifestFeature }) {
  const id = feature.feature.id
  const range = trainingRangeText(feature)
  const unitRaw = feature.units
  const unit =
    isDhwId(id) || isFlowPerM2(id)
      ? (isDhwId(id) ? 'L/s' : 'L/(s·m²)')
      : unitRaw
        ? normalizeUnitLabel(t(unitRaw)) || t(unitRaw)
        : '—'

  return (
    <tr className="border-b border-zinc-800/80">
      <td className="py-2 pr-4 font-medium text-zinc-100">{t(id)}</td>
      <td className="py-2 pr-4 font-mono text-xs text-zinc-500">{id}</td>
      <td className="py-2 pr-4 text-sm text-zinc-400">{unit}</td>
      <td className="py-2 pr-4 text-sm text-zinc-300">{defaultDisplay(feature)}</td>
      <td className="py-2 text-sm text-zinc-500">{range ?? '—'}</td>
    </tr>
  )
}
