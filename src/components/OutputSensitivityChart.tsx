import { ExpandableChart } from './ExpandableChart'
import { useCallback, useMemo, useState } from 'react'
import type { LayersModel } from '@tensorflow/tfjs'
import { t } from '../i18n/t'
import { sliderBoundsForFeature } from '../lib/sliderBounds'
import { formatChartNumber } from '../lib/chartNumberFormat'
import type { EnergyDisplayUnit } from '../lib/volumeConversion'
import { runSurrogatePredictBatch } from '../tf/runSurrogatePredict'
import { slopeColor, SLOPE_GRADIENT } from '../lib/chartSlope'
import { writeChartHandoff } from '../lib/chartHandoff'
import {
  DERIVED_OPTIONS,
  outputSelectionLabel,
  outputSelectionUnit,
  resolveOutputValue,
  type OutputSelection,
} from '../lib/outputSelection'
import type { ManifestFeature, TfModel } from '../types/manifest'

/** Also reused by OutputSmallMultiplesView, so every mini curve has the same resolution. */
export const SWEEP_STEPS = 20

interface OutputSensitivityChartProps {
  surrogateId: string
  model: LayersModel
  tfModel: TfModel
  inputFeatures: ManifestFeature[]
  outputFeatures: ManifestFeature[]
  valueMap: Record<string, number>
  energyMode: EnergyDisplayUnit
  initialInputId?: string
  initialOutputSelection?: OutputSelection
}

export function OutputSensitivityChart({
  surrogateId,
  model,
  tfModel,
  inputFeatures,
  outputFeatures,
  valueMap,
  energyMode,
  initialInputId,
  initialOutputSelection,
}: OutputSensitivityChartProps) {
  const [inputId, setInputId] = useState(
    () => initialInputId ?? inputFeatures[0]?.feature.id ?? '',
  )
  const [outputSelection, setOutputSelection] = useState<OutputSelection>(
    () => initialOutputSelection ?? `tensor:${outputFeatures[0]?.feature.id ?? ''}`,
  )

  const activeInput =
    inputFeatures.find((feature) => feature.feature.id === inputId) ?? inputFeatures[0]

  const series = useMemo(() => {
    if (!activeInput) return { points: [], error: null as string | null }
    const currentValue = valueMap[activeInput.feature.id] ?? 0
    const { min, max } = sliderBoundsForFeature(activeInput, currentValue)

    try {
      const samples = Array.from({ length: SWEEP_STEPS }, (_, index) => {
        const x = min + ((max - min) * index) / (SWEEP_STEPS - 1)
        return { x, values: { ...valueMap, [activeInput.feature.id]: x } }
      })
      const predictions = runSurrogatePredictBatch(
        model,
        inputFeatures,
        outputFeatures,
        samples.map((sample) => sample.values),
      )
      const points = samples.map(({ x, values: sweepValues }, index) => ({
        x,
        y: resolveOutputValue(outputSelection, predictions[index], tfModel, sweepValues, energyMode),
      }))
      return { points, error: null as string | null }
    } catch (error) {
      return {
        points: [],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }, [activeInput, energyMode, inputFeatures, model, outputFeatures, outputSelection, tfModel, valueMap])

  const openInNewTab = useCallback(() => {
    writeChartHandoff({ valueMap })
    const params = new URLSearchParams({
      tf: tfModel.path,
      view: 'sensitivity',
      energy: energyMode,
      input: activeInput?.feature.id ?? '',
      output: outputSelection,
    })
    window.open(`/s/${surrogateId}/chart?${params.toString()}`, '_blank', 'noopener')
  }, [activeInput, energyMode, outputSelection, surrogateId, tfModel.path, valueMap])

  if (!activeInput || outputFeatures.length === 0) return null

  const finitePoints = series.points.filter((point) => Number.isFinite(point.y))
  const minY = finitePoints.length ? Math.min(...finitePoints.map((point) => point.y)) : 0
  const maxY = finitePoints.length ? Math.max(...finitePoints.map((point) => point.y)) : 1
  const minX = finitePoints.length ? finitePoints[0].x : 0
  const maxX = finitePoints.length ? finitePoints[finitePoints.length - 1].x : 1
  const ySpan = maxY - minY || Math.max(Math.abs(maxY) * 0.1, 1)
  const xSpan = maxX - minX || 1

  const unit = outputSelectionUnit(outputSelection, energyMode)

  return (
    <section className="dash-panel rounded border p-1.5 2xl:flex 2xl:flex-1 2xl:flex-col" aria-labelledby="sensitivity-title">
      <div className="mb-1.5 flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label className="dash-muted mb-0.5 block text-[10px] font-semibold uppercase tracking-wide" htmlFor="chart-input">
            Sweep input
          </label>
          <select
            id="chart-input"
            className="dash-select w-full rounded border px-2 py-1 text-xs"
            value={activeInput.feature.id}
            onChange={(event) => setInputId(event.target.value)}
          >
            {inputFeatures.map((feature) => (
              <option key={feature.feature.id} value={feature.feature.id}>{t(feature.feature.id)}</option>
            ))}
          </select>
        </div>
        <div className="min-w-40 flex-1">
          <label className="dash-muted mb-0.5 block text-[10px] font-semibold uppercase tracking-wide" htmlFor="chart-output">
            Chart output
          </label>
          <select
            id="chart-output"
            className="dash-select w-full rounded border px-2 py-1 text-xs"
            value={outputSelection}
            onChange={(event) => setOutputSelection(event.target.value as OutputSelection)}
          >
            <optgroup label="Energy outputs">
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
        <h4 id="sensitivity-title" className="dash-subsection-heading">Sensitivity</h4>
        <span className="dash-muted text-[10px]">{SWEEP_STEPS} steps</span>
      </div>
      {series.error ? (
        <p className="dash-error mt-2 text-xs" role="alert">{series.error}</p>
      ) : (
        <ExpandableChart title="Sensitivity chart" onOpenNewTab={openInNewTab}>
        <div className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-2 text-[10px]">
          <div className="dash-muted flex flex-col justify-between text-right tabular-nums">
            <span>{formatChartNumber(maxY)}</span>
            <span>{formatChartNumber(minY)}</span>
          </div>
          <div>
            <svg className="sensitivity-plot h-20 w-full 2xl:h-56" viewBox="0 0 300 120" preserveAspectRatio="none" role="img" aria-label={`Sensitivity chart with ${SWEEP_STEPS} points`}>
              <line className="dash-chart-grid" x1="8" x2="292" y1="112" y2="112" />
              <line className="dash-chart-grid" x1="8" x2="8" y1="8" y2="112" />
              {(() => {
                const segments = finitePoints.slice(1).map((point, i) => {
                  const prev = finitePoints[i]
                  const dx = point.x - prev.x
                  return { prev, point, slope: dx !== 0 ? (point.y - prev.y) / dx : 0 }
                })
                const maxAbsSlope = Math.max(0, ...segments.map((s) => Math.abs(s.slope))) || 1
                return segments.map(({ prev, point, slope }, i) => (
                  <line
                    key={i}
                    className="dash-chart-line"
                    style={{ stroke: slopeColor(slope / maxAbsSlope) }}
                    x1={8 + ((prev.x - minX) / xSpan) * 284}
                    y1={8 + (1 - (prev.y - minY) / ySpan) * 104}
                    x2={8 + ((point.x - minX) / xSpan) * 284}
                    y2={8 + (1 - (point.y - minY) / ySpan) * 104}
                  />
                ))
              })()}
            </svg>
            <div className="dash-muted flex justify-between tabular-nums">
              <span>{formatChartNumber(minX)}</span>
              <span>{t(activeInput.feature.id)} {activeInput.units ? `(${activeInput.units})` : ''} →</span>
              <span>{formatChartNumber(maxX)}</span>
            </div>
          </div>
          <span />
          <div className="dash-muted mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-right">
            <span>Predicted {t(outputSelectionLabel(outputSelection))} ({unit})</span>
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="inline-block h-0.5 w-8 rounded" style={{ background: SLOPE_GRADIENT }} />
              <span>flat · changing fast</span>
            </span>
          </div>
        </div>
        </ExpandableChart>
      )}
    </section>
  )
}
