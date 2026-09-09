import { ExpandableChart } from './ExpandableChart'
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

interface TornadoRow {
  id: string
  loValue: number
  hiValue: number
  swing: number
}

interface OutputTornadoViewProps {
  surrogateId: string
  model: LayersModel
  tfModel: TfModel
  inputFeatures: ManifestFeature[]
  outputFeatures: ManifestFeature[]
  valueMap: Record<string, number>
  energyMode: EnergyDisplayUnit
  initialOutputSelection?: OutputSelection
}

/**
 * Sweeps each input across its training range one at a time (others held at
 * `valueMap`), ranking by the resulting output swing. Reuses
 * `runSurrogatePredictBatch` for one batched call over all inputs' two extremes,
 * rather than `OutputSensitivityChart`'s per-input 20-step interpolation — a
 * tornado only needs the two range endpoints, not the curve between them.
 */
export function OutputTornadoView({
  surrogateId,
  model,
  tfModel,
  inputFeatures,
  outputFeatures,
  valueMap,
  energyMode,
  initialOutputSelection,
}: OutputTornadoViewProps) {
  const [outputSelection, setOutputSelection] = useState<OutputSelection>(
    () => initialOutputSelection ?? `tensor:${outputFeatures[0]?.feature.id ?? ''}`,
  )

  const tornado = useMemo(() => {
    if (inputFeatures.length === 0) return { rows: [] as TornadoRow[], error: null as string | null }
    try {
      const bounds = inputFeatures.map((f) => sliderBoundsForFeature(f, valueMap[f.feature.id] ?? 0))
      const samples = inputFeatures.flatMap((f, i) => [
        { ...valueMap, [f.feature.id]: bounds[i].min },
        { ...valueMap, [f.feature.id]: bounds[i].max },
      ])
      const predictions = runSurrogatePredictBatch(model, inputFeatures, outputFeatures, samples)
      const rows = inputFeatures
        .map((f, i) => {
          const loValues = samples[i * 2]
          const hiValues = samples[i * 2 + 1]
          const loValue = resolveOutputValue(outputSelection, predictions[i * 2], tfModel, loValues, energyMode)
          const hiValue = resolveOutputValue(outputSelection, predictions[i * 2 + 1], tfModel, hiValues, energyMode)
          return { id: f.feature.id, loValue, hiValue, swing: Math.abs(hiValue - loValue) }
        })
        .filter((row) => Number.isFinite(row.swing))
        .sort((a, b) => b.swing - a.swing)
      return { rows, error: null as string | null }
    } catch (error) {
      return { rows: [] as TornadoRow[], error: error instanceof Error ? error.message : String(error) }
    }
  }, [energyMode, inputFeatures, model, outputFeatures, outputSelection, tfModel, valueMap])

  const openInNewTab = useCallback(() => {
    writeChartHandoff({ valueMap })
    const params = new URLSearchParams({
      tf: tfModel.path,
      view: 'tornado',
      energy: energyMode,
      output: outputSelection,
    })
    window.open(`/s/${surrogateId}/chart?${params.toString()}`, '_blank', 'noopener')
  }, [energyMode, outputSelection, surrogateId, tfModel.path, valueMap])

  if (outputFeatures.length === 0) return null

  const unit = outputSelectionUnit(outputSelection, energyMode)
  const maxSwing = Math.max(...tornado.rows.map((row) => row.swing), 1e-9)

  return (
    <section className="dash-panel rounded border p-1.5 2xl:flex 2xl:flex-1 2xl:flex-col" aria-labelledby="tornado-title">
      <div className="mb-1.5 flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label className="dash-muted mb-0.5 block text-[10px] font-semibold uppercase tracking-wide" htmlFor="tornado-output">
            Output
          </label>
          <select
            id="tornado-output"
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
        <h4 id="tornado-title" className="dash-subsection-heading">Tornado</h4>
        <span className="dash-muted text-[10px]">{tornado.rows.length} inputs</span>
      </div>
      {tornado.error ? (
        <p className="dash-error mt-2 text-xs" role="alert">{tornado.error}</p>
      ) : (
        <ExpandableChart title="Tornado chart" onOpenNewTab={openInNewTab}>
          <div className="tornado-plot mt-1 max-h-96 space-y-1.5 overflow-y-auto pr-1 text-[10px] 2xl:max-h-[32rem]">
            {tornado.rows.map((row) => (
              <div key={row.id}>
                <div className="mb-0.5 flex items-baseline justify-between gap-2">
                  <span className="dash-text min-w-0 truncate">{t(row.id)}</span>
                  <span className="dash-muted shrink-0 tabular-nums">
                    {formatChartNumber(row.loValue)} → {formatChartNumber(row.hiValue)}
                  </span>
                </div>
                <div className="dash-track h-2.5 w-full overflow-hidden rounded">
                  <div className="dash-bar h-full rounded" style={{ width: `${(row.swing / maxSwing) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="dash-muted mt-2 text-[10px]">
            Swing = predicted {t(outputSelectionLabel(outputSelection))} ({unit}) at each input&rsquo;s training max
            minus at its training min, holding other inputs at current values. Ranked longest first.
          </p>
        </ExpandableChart>
      )}
    </section>
  )
}
