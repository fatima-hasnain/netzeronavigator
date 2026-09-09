import { ExpandableChart } from './ExpandableChart'
import { magnitudeColor, MAGNITUDE_GRADIENT } from '../lib/chartMagnitude'
import { useCallback, useMemo, useState } from 'react'
import type { LayersModel } from '@tensorflow/tfjs'
import { t } from '../i18n/t'
import { sliderBoundsForFeature } from '../lib/sliderBounds'
import { formatChartNumber } from '../lib/chartNumberFormat'
import type { EnergyDisplayUnit } from '../lib/volumeConversion'
import { runSurrogatePredictBatch } from '../tf/runSurrogatePredict'
import { writeChartHandoff } from '../lib/chartHandoff'
import {
  DERIVED_OPTIONS,
  outputSelectionLabel,
  outputSelectionUnit,
  resolveOutputValue,
  type OutputSelection,
} from '../lib/outputSelection'
import type { ManifestFeature, TfModel } from '../types/manifest'

const GRID_STEPS = 20

interface OutputHeatmapViewProps {
  surrogateId: string
  model: LayersModel
  tfModel: TfModel
  inputFeatures: ManifestFeature[]
  outputFeatures: ManifestFeature[]
  valueMap: Record<string, number>
  energyMode: EnergyDisplayUnit
  initialXInputId?: string
  initialYInputId?: string
  initialOutputSelection?: OutputSelection
}

export function OutputHeatmapView({
  surrogateId,
  model,
  tfModel,
  inputFeatures,
  outputFeatures,
  valueMap,
  energyMode,
  initialXInputId,
  initialYInputId,
  initialOutputSelection,
}: OutputHeatmapViewProps) {
  const [xInputId, setXInputId] = useState(
    () => initialXInputId ?? inputFeatures[0]?.feature.id ?? '',
  )
  const [yInputId, setYInputId] = useState(
    () => initialYInputId ?? inputFeatures[1]?.feature.id ?? '',
  )
  const [outputSelection, setOutputSelection] = useState<OutputSelection>(
    () => initialOutputSelection ?? `tensor:${outputFeatures[0]?.feature.id ?? ''}`,
  )

  const xInput = inputFeatures.find((feature) => feature.feature.id === xInputId) ?? inputFeatures[0]
  const yInput = inputFeatures.find((feature) => feature.feature.id === yInputId) ?? inputFeatures[1]

  const heatmap = useMemo(() => {
    if (!xInput || !yInput) return { cells: [], error: null as string | null, xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
    const xBounds = sliderBoundsForFeature(xInput, valueMap[xInput.feature.id] ?? 0)
    const yBounds = sliderBoundsForFeature(yInput, valueMap[yInput.feature.id] ?? 0)
    const samples = Array.from({ length: GRID_STEPS * GRID_STEPS }, (_, index) => {
      const xIndex = index % GRID_STEPS
      const yIndex = Math.floor(index / GRID_STEPS)
      const x = xBounds.min + ((xBounds.max - xBounds.min) * xIndex) / (GRID_STEPS - 1)
      const y = yBounds.min + ((yBounds.max - yBounds.min) * yIndex) / (GRID_STEPS - 1)
      return { xIndex, yIndex, values: { ...valueMap, [xInput.feature.id]: x, [yInput.feature.id]: y } }
    })

    try {
      const predictions = runSurrogatePredictBatch(
        model,
        inputFeatures,
        outputFeatures,
        samples.map((sample) => sample.values),
      )
      const cells = samples.map((sample, index) => ({
        xIndex: sample.xIndex,
        yIndex: sample.yIndex,
        value: resolveOutputValue(outputSelection, predictions[index], tfModel, sample.values, energyMode),
      }))
      return { cells, error: null as string | null, xMin: xBounds.min, xMax: xBounds.max, yMin: yBounds.min, yMax: yBounds.max }
    } catch (error) {
      return { cells: [], error: error instanceof Error ? error.message : String(error), xMin: xBounds.min, xMax: xBounds.max, yMin: yBounds.min, yMax: yBounds.max }
    }
  }, [energyMode, inputFeatures, model, outputFeatures, outputSelection, tfModel, valueMap, xInput, yInput])

  const openInNewTab = useCallback(() => {
    writeChartHandoff({ valueMap })
    const params = new URLSearchParams({
      tf: tfModel.path,
      view: 'heatmap',
      energy: energyMode,
      x: xInput?.feature.id ?? '',
      y: yInput?.feature.id ?? '',
      output: outputSelection,
    })
    window.open(`/s/${surrogateId}/chart?${params.toString()}`, '_blank', 'noopener')
  }, [energyMode, outputSelection, surrogateId, tfModel.path, valueMap, xInput, yInput])

  if (!xInput || !yInput || outputFeatures.length === 0) {
    return <div className="dash-panel dash-muted rounded border p-4 text-xs">At least two inputs are required for a heatmap.</div>
  }

  const values = heatmap.cells.map((cell) => cell.value).filter(Number.isFinite)
  const minValue = values.length ? Math.min(...values) : 0
  const maxValue = values.length ? Math.max(...values) : 1
  const span = maxValue - minValue || 1
  const cellSize = 200 / GRID_STEPS
  const unit = outputSelectionUnit(outputSelection, energyMode)

  return (
    <section className="dash-panel rounded border p-1.5 2xl:flex 2xl:flex-1 2xl:flex-col" aria-labelledby="heatmap-title">
      <div className="mb-1.5 grid gap-2 sm:grid-cols-3">
        <label className="dash-muted text-[10px] font-semibold uppercase tracking-wide">
          X input
          <select className="dash-select mt-0.5 block w-full rounded border px-2 py-1 text-xs normal-case" value={xInput.feature.id} onChange={(event) => setXInputId(event.target.value)}>
            {inputFeatures.filter((feature) => feature.feature.id !== yInput.feature.id).map((feature) => <option key={feature.feature.id} value={feature.feature.id}>{t(feature.feature.id)}</option>)}
          </select>
        </label>
        <label className="dash-muted text-[10px] font-semibold uppercase tracking-wide">
          Y input
          <select className="dash-select mt-0.5 block w-full rounded border px-2 py-1 text-xs normal-case" value={yInput.feature.id} onChange={(event) => setYInputId(event.target.value)}>
            {inputFeatures.filter((feature) => feature.feature.id !== xInput.feature.id).map((feature) => <option key={feature.feature.id} value={feature.feature.id}>{t(feature.feature.id)}</option>)}
          </select>
        </label>
        <label className="dash-muted text-[10px] font-semibold uppercase tracking-wide">
          Output
          <select className="dash-select mt-0.5 block w-full rounded border px-2 py-1 text-xs normal-case" value={outputSelection} onChange={(event) => setOutputSelection(event.target.value as OutputSelection)}>
            <optgroup label="Energy outputs">{outputFeatures.map((feature) => <option key={feature.feature.id} value={`tensor:${feature.feature.id}`}>{t(feature.feature.id)}</option>)}</optgroup>
            <optgroup label="Derived metrics">{DERIVED_OPTIONS.map(([key, label]) => <option key={key} value={`derived:${key}`}>{label}</option>)}</optgroup>
          </select>
        </label>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <h4 id="heatmap-title" className="dash-subsection-heading">Two-input heatmap</h4>
        <span className="dash-muted text-[10px]">{GRID_STEPS} × {GRID_STEPS} grid</span>
      </div>
      {heatmap.error ? <p className="dash-error mt-2 text-xs" role="alert">{heatmap.error}</p> : (
        <ExpandableChart title="Two-input heatmap" onOpenNewTab={openInNewTab}><p className="dash-muted mt-2 text-xs">Colour shows output magnitude: blue = lower, grey = middle, gold = higher within this sweep.</p>
        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-[10px]">
          <div className="dash-muted flex flex-col justify-between text-right"><span>{formatChartNumber(heatmap.yMax)}</span><span>{t(yInput.feature.id)}</span><span>{formatChartNumber(heatmap.yMin)}</span></div>
          <div>
            <svg className="mx-auto block heatmap-plot aspect-square max-h-40 w-full 2xl:max-h-56" viewBox="0 0 200 200" role="img" aria-label={`${t(outputSelectionLabel(outputSelection))} heatmap by ${t(xInput.feature.id)} and ${t(yInput.feature.id)}`}>
              {heatmap.cells.map((cell) => {
                const intensity = Number.isFinite(cell.value) ? (cell.value - minValue) / span : 0
                return <rect key={`${cell.xIndex}-${cell.yIndex}`} x={cell.xIndex * cellSize} y={(GRID_STEPS - 1 - cell.yIndex) * cellSize} width={cellSize + 0.15} height={cellSize + 0.15} fill={magnitudeColor(intensity)}><title>{cell.value.toLocaleString('en-CA', { maximumSignificantDigits: 8 })} {unit}</title></rect>
              })}
            </svg>
            <div className="dash-muted mt-1 flex justify-between"><span>{formatChartNumber(heatmap.xMin)}</span><span>{t(xInput.feature.id)} →</span><span>{formatChartNumber(heatmap.xMax)}</span></div>
            <div className="mt-2 flex items-center gap-2"><span className="dash-muted">{formatChartNumber(minValue)}</span><span className="dash-heatmap-legend h-2 flex-1 rounded" style={{ background: MAGNITUDE_GRADIENT }} /><span className="dash-muted">{formatChartNumber(maxValue)} {unit}</span></div>
          </div>
        </div>
        </ExpandableChart>
      )}
    </section>
  )
}
