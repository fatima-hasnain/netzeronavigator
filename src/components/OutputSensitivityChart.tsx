import { useMemo, useState } from 'react'
import type { LayersModel } from '@tensorflow/tfjs'
import { t } from '../i18n/t'
import {
  computeDerivedMetrics,
  contextRecordForDerived,
  mergeDerivedContext,
  outputsRecordToJ,
} from '../lib/derivedMetrics'
import { sliderBoundsForFeature } from '../lib/sliderBounds'
import { jToKwh, jToMwh, type EnergyDisplayUnit } from '../lib/volumeConversion'
import { runSurrogatePredict } from '../tf/runSurrogatePredict'
import type { ManifestFeature, TfModel } from '../types/manifest'

const SWEEP_STEPS = 20

const DERIVED_OPTIONS = [
  ['TEDI', 'Thermal Energy Demand Intensity'],
  ['CEDI', 'Cooling Energy Demand Intensity'],
  ['EUI', 'Energy Use Intensity'],
  ['GHGI', 'GHG Intensity'],
  ['OPERATING_COST', 'Operating Cost'],
] as const

type DerivedKey = (typeof DERIVED_OPTIONS)[number][0]
type OutputSelection = `tensor:${string}` | `derived:${DerivedKey}`

interface OutputSensitivityChartProps {
  model: LayersModel
  tfModel: TfModel
  inputFeatures: ManifestFeature[]
  outputFeatures: ManifestFeature[]
  valueMap: Record<string, number>
  energyMode: EnergyDisplayUnit
}

function displayTensorValue(joules: number, mode: EnergyDisplayUnit): number {
  if (mode === 'kWh') return jToKwh(joules)
  if (mode === 'MWh') return jToMwh(joules)
  return joules
}

function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const magnitude = Math.abs(value)
  if (magnitude >= 1e6 || (magnitude > 0 && magnitude < 0.01)) {
    return value.toExponential(2)
  }
  return value.toLocaleString('en-CA', { maximumFractionDigits: 2 })
}

export function OutputSensitivityChart({
  model,
  tfModel,
  inputFeatures,
  outputFeatures,
  valueMap,
  energyMode,
}: OutputSensitivityChartProps) {
  const [inputId, setInputId] = useState(() => inputFeatures[0]?.feature.id ?? '')
  const [outputSelection, setOutputSelection] = useState<OutputSelection>(() =>
    `tensor:${outputFeatures[0]?.feature.id ?? ''}`,
  )

  const activeInput =
    inputFeatures.find((feature) => feature.feature.id === inputId) ?? inputFeatures[0]

  const series = useMemo(() => {
    if (!activeInput) return { points: [], error: null as string | null }
    const currentValue = valueMap[activeInput.feature.id] ?? 0
    const { min, max } = sliderBoundsForFeature(activeInput, currentValue)

    try {
      const points = Array.from({ length: SWEEP_STEPS }, (_, index) => {
        const x = min + ((max - min) * index) / (SWEEP_STEPS - 1)
        const sweepValues = { ...valueMap, [activeInput.feature.id]: x }
        const prediction = runSurrogatePredict(
          model,
          inputFeatures,
          outputFeatures,
          sweepValues,
        )

        if (outputSelection.startsWith('tensor:')) {
          const outputId = outputSelection.slice('tensor:'.length)
          return { x, y: displayTensorValue(prediction[outputId], energyMode) }
        }

        const rawOutputs = outputsRecordToJ(prediction)
        if (!rawOutputs) return { x, y: Number.NaN }
        const context = contextRecordForDerived(mergeDerivedContext(tfModel, sweepValues))
        const derived = computeDerivedMetrics(rawOutputs, context)
        const key = outputSelection.slice('derived:'.length) as DerivedKey
        return { x, y: derived[key] }
      })
      return { points, error: null as string | null }
    } catch (error) {
      return {
        points: [],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }, [activeInput, energyMode, inputFeatures, model, outputFeatures, outputSelection, tfModel, valueMap])

  if (!activeInput || outputFeatures.length === 0) return null

  const finitePoints = series.points.filter((point) => Number.isFinite(point.y))
  const minY = finitePoints.length ? Math.min(...finitePoints.map((point) => point.y)) : 0
  const maxY = finitePoints.length ? Math.max(...finitePoints.map((point) => point.y)) : 1
  const minX = finitePoints.length ? finitePoints[0].x : 0
  const maxX = finitePoints.length ? finitePoints[finitePoints.length - 1].x : 1
  const ySpan = maxY - minY || Math.max(Math.abs(maxY) * 0.1, 1)
  const xSpan = maxX - minX || 1
  const polyline = finitePoints
    .map((point) => `${8 + ((point.x - minX) / xSpan) * 284},${8 + (1 - (point.y - minY) / ySpan) * 104}`)
    .join(' ')
  const isTensor = outputSelection.startsWith('tensor:')
  const unit = isTensor
    ? energyMode
    : outputSelection === 'derived:GHGI'
      ? 'kgCO₂/m²'
      : outputSelection === 'derived:OPERATING_COST'
        ? '$/m²'
        : 'kWh/m²'

  return (
    <section className="dash-panel rounded border p-3" aria-labelledby="sensitivity-title">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          <label className="dash-muted mb-1 block text-[10px] font-semibold uppercase tracking-wide" htmlFor="chart-input">
            Sweep input
          </label>
          <select
            id="chart-input"
            className="dash-select w-full rounded border px-2 py-1.5 text-xs"
            value={activeInput.feature.id}
            onChange={(event) => setInputId(event.target.value)}
          >
            {inputFeatures.map((feature) => (
              <option key={feature.feature.id} value={feature.feature.id}>{t(feature.feature.id)}</option>
            ))}
          </select>
        </div>
        <div className="min-w-40 flex-1">
          <label className="dash-muted mb-1 block text-[10px] font-semibold uppercase tracking-wide" htmlFor="chart-output">
            Chart output
          </label>
          <select
            id="chart-output"
            className="dash-select w-full rounded border px-2 py-1.5 text-xs"
            value={outputSelection}
            onChange={(event) => setOutputSelection(event.target.value as OutputSelection)}
          >
            <optgroup label="Tensor outputs">
              {outputFeatures.map((feature) => (
                <option key={feature.feature.id} value={`tensor:${feature.feature.id}`}>{t(feature.feature.id)}</option>
              ))}
            </optgroup>
            <optgroup label="Derived metrics">
              {DERIVED_OPTIONS.map(([key, label]) => (
                <option key={key} value={`derived:${key}`}>{label}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <h4 id="sensitivity-title" className="dash-heading text-xs font-semibold">Sensitivity</h4>
        <span className="dash-muted text-[10px]">{SWEEP_STEPS} steps</span>
      </div>
      {series.error ? (
        <p className="dash-error mt-2 text-xs" role="alert">{series.error}</p>
      ) : (
        <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 text-[10px]">
          <div className="dash-muted flex flex-col justify-between text-right tabular-nums">
            <span>{compactNumber(maxY)}</span>
            <span>{compactNumber(minY)}</span>
          </div>
          <div>
            <svg className="h-32 w-full" viewBox="0 0 300 120" preserveAspectRatio="none" role="img" aria-label={`Sensitivity chart with ${SWEEP_STEPS} points`}>
              <line className="dash-chart-grid" x1="8" x2="292" y1="112" y2="112" />
              <line className="dash-chart-grid" x1="8" x2="8" y1="8" y2="112" />
              <polyline className="dash-chart-line" points={polyline} />
            </svg>
            <div className="dash-muted flex justify-between tabular-nums">
              <span>{compactNumber(minX)}</span>
              <span>{t(activeInput.feature.id)} →</span>
              <span>{compactNumber(maxX)}</span>
            </div>
          </div>
          <span />
          <div className="dash-muted mt-1 text-right">Output unit: {unit}</div>
        </div>
      )}
    </section>
  )
}
