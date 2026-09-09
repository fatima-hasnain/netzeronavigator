import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import type { LayersModel } from '@tensorflow/tfjs'
import { t } from '../i18n/t'
import {
  computeDerivedMetrics,
  contextRecordForDerived,
  mergeDerivedContext,
  outputsRecordToJ,
} from '../lib/derivedMetrics'
import { stepForFeatureId } from '../lib/displayFormat'
import { normalizeUnitLabel } from '../lib/unitNormalize'
import { formatEnergy, type EnergyDisplayUnit } from '../lib/volumeConversion'
import { runSurrogatePredict } from '../tf/runSurrogatePredict'
import type { ManifestFeature, TfModel } from '../types/manifest'

interface OutputComparisonViewProps {
  model: LayersModel
  tfModel: TfModel
  inputFeatures: ManifestFeature[]
  outputFeatures: ManifestFeature[]
  initialValues: Record<string, number>
  energyMode: EnergyDisplayUnit
}

const DERIVED_METRICS = [
  ['TEDI', 'Thermal Energy Demand Intensity', 'kWh/m²'],
  ['CEDI', 'Cooling Energy Demand Intensity', 'kWh/m²'],
  ['EUI', 'Energy Use Intensity', 'kWh/m²'],
  ['GHGI', 'GHG Intensity', 'kgCO₂/m²'],
  ['OPERATING_COST', 'Operating Cost', '$/m²'],
] as const

function signed(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—'
  const text = Math.abs(value).toLocaleString('en-CA', { maximumFractionDigits })
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : text
}

export function OutputComparisonView({
  model,
  tfModel,
  inputFeatures,
  outputFeatures,
  initialValues,
  energyMode,
}: OutputComparisonViewProps) {
  const [designA, setDesignA] = useState<Record<string, number>>(() => ({ ...initialValues }))
  const [designB, setDesignB] = useState<Record<string, number>>(() => ({ ...initialValues }))

  const predictions = useMemo(() => {
    try {
      return {
        a: runSurrogatePredict(model, inputFeatures, outputFeatures, designA),
        b: runSurrogatePredict(model, inputFeatures, outputFeatures, designB),
        error: null as string | null,
      }
    } catch (error) {
      return {
        a: null,
        b: null,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }, [designA, designB, inputFeatures, model, outputFeatures])

  const derived = useMemo(() => {
    const calculate = (
      outputs: Record<string, number> | null,
      values: Record<string, number>,
    ) => {
      if (!outputs) return null
      const joules = outputsRecordToJ(outputs)
      if (!joules) return null
      return computeDerivedMetrics(
        joules,
        contextRecordForDerived(mergeDerivedContext(tfModel, values)),
      )
    }
    return {
      a: calculate(predictions.a, designA),
      b: calculate(predictions.b, designB),
    }
  }, [designA, designB, predictions.a, predictions.b, tfModel])

  const update = (
    setter: Dispatch<SetStateAction<Record<string, number>>>,
    id: string,
    raw: string,
  ) => {
    const value = Number(raw)
    if (raw === '' || !Number.isFinite(value)) return
    setter((current) => ({ ...current, [id]: value }))
  }

  return (
    <section className="dash-panel rounded border p-1.5 2xl:flex 2xl:flex-1 2xl:flex-col" aria-labelledby="comparison-title">
      <div className="flex items-center justify-between gap-2">
        <h4 id="comparison-title" className="dash-subsection-heading">Design comparison</h4>
        <span className="dash-muted text-[10px]">Difference = B − A</span>
      </div>

      <div className="mt-3 max-h-64 overflow-auto">
        <table className="w-full min-w-[28rem] text-left text-xs">
          <thead className="dash-muted sticky top-0 bg-[var(--dash-surface-raised)]">
            <tr className="dash-divider border-b">
              <th className="px-2 py-1.5 font-medium">Input parameter</th>
              <th className="px-2 py-1.5 font-medium">Design A</th>
              <th className="px-2 py-1.5 font-medium">Design B</th>
            </tr>
          </thead>
          <tbody>
            {inputFeatures.map((feature) => {
              const id = feature.feature.id
              const unit = normalizeUnitLabel(feature.units) || feature.units || ''
              return (
                <tr key={id} className="dash-divider border-b last:border-0">
                  <th className="dash-text px-2 py-1.5 font-medium">
                    {t(id)}{unit ? <span className="dash-muted ml-1 font-normal">[{unit}]</span> : null}
                  </th>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className="dash-control w-full rounded border px-2 py-1 font-mono"
                      step={stepForFeatureId(id)}
                      value={designA[id] ?? 0}
                      aria-label={`${t(id)} for design A`}
                      onChange={(event) => update(setDesignA, id, event.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className="dash-control w-full rounded border px-2 py-1 font-mono"
                      step={stepForFeatureId(id)}
                      value={designB[id] ?? 0}
                      aria-label={`${t(id)} for design B`}
                      onChange={(event) => update(setDesignB, id, event.target.value)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {predictions.error ? (
        <p className="dash-error mt-3 text-xs" role="alert">{predictions.error}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-right text-xs tabular-nums">
            <thead className="dash-muted">
              <tr className="dash-divider border-b">
                <th className="px-2 py-1.5 text-left font-medium">Output</th>
                <th className="px-2 py-1.5 font-medium">A</th>
                <th className="px-2 py-1.5 font-medium">B</th>
                <th className="px-2 py-1.5 font-medium">Δ B−A</th>
              </tr>
            </thead>
            <tbody>
              {outputFeatures.map((feature) => {
                const id = feature.feature.id
                const a = predictions.a?.[id] ?? Number.NaN
                const b = predictions.b?.[id] ?? Number.NaN
                const formattedA = formatEnergy(a, energyMode, 'en-CA')
                const formattedB = formatEnergy(b, energyMode, 'en-CA')
                const formattedDelta = formatEnergy(b - a, energyMode, 'en-CA')
                return (
                  <tr key={id} className="dash-divider border-b">
                    <th className="dash-text px-2 py-1.5 text-left font-medium">{t(id)}</th>
                    <td className="px-2 py-1.5 font-mono">{formattedA.text} <span className="dash-muted">{formattedA.unit}</span></td>
                    <td className="px-2 py-1.5 font-mono">{formattedB.text} <span className="dash-muted">{formattedB.unit}</span></td>
                    <td className="dash-accent-text px-2 py-1.5 font-mono">{formattedDelta.text} <span className="dash-muted">{formattedDelta.unit}</span></td>
                  </tr>
                )
              })}
              {DERIVED_METRICS.map(([key, label, unit]) => {
                const a = derived.a?.[key] ?? Number.NaN
                const b = derived.b?.[key] ?? Number.NaN
                return (
                  <tr key={key} className="dash-divider border-b last:border-0">
                    <th className="dash-text px-2 py-1.5 text-left font-medium">{label}</th>
                    <td className="px-2 py-1.5 font-mono">{Number.isFinite(a) ? a.toFixed(2) : '—'} <span className="dash-muted">{unit}</span></td>
                    <td className="px-2 py-1.5 font-mono">{Number.isFinite(b) ? b.toFixed(2) : '—'} <span className="dash-muted">{unit}</span></td>
                    <td className="dash-accent-text px-2 py-1.5 font-mono">{signed(b - a)} <span className="dash-muted">{unit}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
