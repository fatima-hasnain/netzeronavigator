import { ExpandableChart } from './ExpandableChart'
import { useCallback, useMemo, useState } from 'react'
import type { LayersModel } from '@tensorflow/tfjs'
import { t } from '../i18n/t'
import { sliderBoundsForFeature } from '../lib/sliderBounds'
import { formatChartNumber } from '../lib/chartNumberFormat'
import type { EnergyDisplayUnit } from '../lib/volumeConversion'
import { runSurrogatePredictBatch } from '../tf/runSurrogatePredict'
import { writeChartHandoff } from '../lib/chartHandoff'
import { SWEEP_STEPS } from './OutputSensitivityChart'
import {
  DERIVED_OPTIONS,
  outputSelectionLabel,
  outputSelectionUnit,
  resolveOutputValue,
  type OutputSelection,
} from '../lib/outputSelection'
import type { ManifestFeature, TfModel } from '../types/manifest'

interface MiniSeries {
  id: string
  points: { x: number; y: number }[]
}

interface OutputSmallMultiplesViewProps {
  surrogateId: string
  model: LayersModel
  tfModel: TfModel
  inputFeatures: ManifestFeature[]
  outputFeatures: ManifestFeature[]
  valueMap: Record<string, number>
  energyMode: EnergyDisplayUnit
  initialOutputSelection?: OutputSelection
  /** Called with the clicked tile's input id and the currently selected output. */
  onOpenInSensitivity: (inputId: string, outputSelection: OutputSelection) => void
}

/**
 * One miniature sensitivity curve per input, all sharing a single y-axis scale so
 * a flat tile genuinely means "barely matters" rather than an artifact of per-tile
 * autoscaling. Reuses the same batched-sweep approach as OutputSensitivityChart —
 * one runSurrogatePredictBatch call over every input's SWEEP_STEPS samples
 * concatenated together, rather than one call per tile.
 */
export function OutputSmallMultiplesView({
  surrogateId,
  model,
  tfModel,
  inputFeatures,
  outputFeatures,
  valueMap,
  energyMode,
  initialOutputSelection,
  onOpenInSensitivity,
}: OutputSmallMultiplesViewProps) {
  const [outputSelection, setOutputSelection] = useState<OutputSelection>(
    () => initialOutputSelection ?? `tensor:${outputFeatures[0]?.feature.id ?? ''}`,
  )

  const multiples = useMemo(() => {
    if (inputFeatures.length === 0) {
      return { series: [] as MiniSeries[], globalMin: 0, globalMax: 1, error: null as string | null }
    }
    try {
      const bounds = inputFeatures.map((f) => sliderBoundsForFeature(f, valueMap[f.feature.id] ?? 0))
      const samples = inputFeatures.flatMap((f, i) => {
        const { min, max } = bounds[i]
        return Array.from({ length: SWEEP_STEPS }, (_, step) => {
          const x = min + ((max - min) * step) / (SWEEP_STEPS - 1)
          return { x, values: { ...valueMap, [f.feature.id]: x } }
        })
      })
      const predictions = runSurrogatePredictBatch(
        model,
        inputFeatures,
        outputFeatures,
        samples.map((sample) => sample.values),
      )
      const series = inputFeatures.map((f, i) => {
        const offset = i * SWEEP_STEPS
        const points = Array.from({ length: SWEEP_STEPS }, (_, step) => {
          const sample = samples[offset + step]
          return {
            x: sample.x,
            y: resolveOutputValue(outputSelection, predictions[offset + step], tfModel, sample.values, energyMode),
          }
        })
        return { id: f.feature.id, points }
      })
      const allY = series.flatMap((s) => s.points.map((p) => p.y)).filter(Number.isFinite)
      const globalMin = allY.length ? Math.min(...allY) : 0
      const globalMax = allY.length ? Math.max(...allY) : 1
      return { series, globalMin, globalMax, error: null as string | null }
    } catch (error) {
      return {
        series: [] as MiniSeries[],
        globalMin: 0,
        globalMax: 1,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }, [energyMode, inputFeatures, model, outputFeatures, outputSelection, tfModel, valueMap])

  const openInNewTab = useCallback(() => {
    writeChartHandoff({ valueMap })
    const params = new URLSearchParams({
      tf: tfModel.path,
      view: 'small-multiples',
      energy: energyMode,
      output: outputSelection,
    })
    window.open(`/s/${surrogateId}/chart?${params.toString()}`, '_blank', 'noopener')
  }, [energyMode, outputSelection, surrogateId, tfModel.path, valueMap])

  if (outputFeatures.length === 0) return null

  const unit = outputSelectionUnit(outputSelection, energyMode)
  const ySpan = multiples.globalMax - multiples.globalMin || 1

  return (
    <section className="dash-panel rounded border p-1.5 2xl:flex 2xl:flex-1 2xl:flex-col" aria-labelledby="small-multiples-title">
      <div className="mb-1.5 flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label className="dash-muted mb-0.5 block text-[10px] font-semibold uppercase tracking-wide" htmlFor="small-multiples-output">
            Output
          </label>
          <select
            id="small-multiples-output"
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
        <h4 id="small-multiples-title" className="dash-subsection-heading">Small Multiples</h4>
        <span className="dash-muted text-[10px]">{multiples.series.length} inputs</span>
      </div>
      {multiples.error ? (
        <p className="dash-error mt-2 text-xs" role="alert">{multiples.error}</p>
      ) : (
        <ExpandableChart title="Small multiples" onOpenNewTab={openInNewTab}>
          <p className="dash-muted mt-1 text-[10px]">
            Shared y-axis: {formatChartNumber(multiples.globalMin)} – {formatChartNumber(multiples.globalMax)} {unit}
            {' '}for predicted {t(outputSelectionLabel(outputSelection))}. Click a tile to open it in Sensitivity.
          </p>
          <div className="small-multiples-plot mt-2 grid max-h-96 grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2 overflow-y-auto pr-1 2xl:max-h-[32rem]">
            {multiples.series.map((s) => {
              const finite = s.points.filter((p) => Number.isFinite(p.y))
              const minX = finite.length ? finite[0].x : 0
              const maxX = finite.length ? finite[finite.length - 1].x : 1
              const xSpan = maxX - minX || 1
              return (
                <button
                  key={s.id}
                  type="button"
                  className="dash-card rounded-md border p-1.5 text-left transition-colors hover:border-[var(--dash-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dash-accent)]"
                  onClick={() => onOpenInSensitivity(s.id, outputSelection)}
                  aria-label={`Open ${t(s.id)} in Sensitivity view`}
                >
                  <div className="dash-text truncate text-[10px] font-medium">{t(s.id)}</div>
                  <svg
                    className="mini-sensitivity-plot mt-1 h-16 w-full"
                    viewBox="0 0 100 40"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <line className="dash-chart-grid" x1="0" x2="100" y1="36" y2="36" />
                    {finite.slice(1).map((point, i) => {
                      const prev = finite[i]
                      return (
                        <line
                          key={i}
                          className="dash-chart-line"
                          x1={((prev.x - minX) / xSpan) * 100}
                          y1={4 + (1 - (prev.y - multiples.globalMin) / ySpan) * 32}
                          x2={((point.x - minX) / xSpan) * 100}
                          y2={4 + (1 - (point.y - multiples.globalMin) / ySpan) * 32}
                        />
                      )
                    })}
                  </svg>
                </button>
              )
            })}
          </div>
        </ExpandableChart>
      )}
    </section>
  )
}
