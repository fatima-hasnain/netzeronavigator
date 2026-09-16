import { featureLabel, formatModelOutput, isJoules, supportsDerived } from '../lib/modelDisplay'
import { useCallback, useMemo, useState } from 'react'
import {
  computeDerivedMetrics,
  contextRecordForDerived,
  mergeDerivedContext,
  outputsRecordToJ,
} from '../lib/derivedMetrics'
import {
  DEFAULT_REFERENCE_EUI_KWH_M2,
  derivedIntensityLevel,
  derivedMetricBarFraction,
  energyOutputLevelJ,
  ghgOrCostLevel,
} from '../lib/outputCardMeta'
import { type EnergyDisplayUnit } from '../lib/volumeConversion'
import type { OutputSelection } from '../lib/outputSelection'
import { OutputSensitivityChart } from './OutputSensitivityChart'
import { OutputComparisonView } from './OutputComparisonView'
import { OutputHeatmapView } from './OutputHeatmapView'
import { OutputTornadoView } from './OutputTornadoView'
import { OutputSmallMultiplesView } from './OutputSmallMultiplesView'
import type { LayersModel } from '@tensorflow/tfjs'
import type { ManifestFeature, TfModel } from '../types/manifest'

function Skeleton() {
  return (
    <span
      className="dash-skeleton inline-block h-4 w-20 animate-pulse rounded"
      aria-hidden
    />
  )
}

export interface OutputReadoutPaneProps {
  surrogateId: string
  features: ManifestFeature[]
  outputs: Record<string, number> | null
  isOutputUpdating: boolean
  isPredicting: boolean
  predictError: string | null
  tfModel: TfModel
  valueMap: Record<string, number>
  inferenceWasSlow: boolean
  model: LayersModel
  inputFeatures: ManifestFeature[]
}

const DERIVED_ORDER: {
  key: 'TEDI' | 'CEDI' | 'EUI' | 'GHGI' | 'OPERATING_COST'
}[] = [
  { key: 'TEDI' },
  { key: 'CEDI' },
  { key: 'EUI' },
  { key: 'GHGI' },
  { key: 'OPERATING_COST' },
]

function EnergyOutputRow({
  f,
  j,
  mode,
  busy,
}: {
  f: ManifestFeature
  j: number | undefined
  mode: EnergyDisplayUnit
  busy: boolean
}) {
  const { text, unit } =
    j === undefined || !Number.isFinite(j)
      ? { text: '—', unit: '' }
      : formatModelOutput(j, f, mode)
  const { label, className } =
    isJoules(f) && j !== undefined && Number.isFinite(j)
      ? energyOutputLevelJ(j)
      : { label: '—', className: 'dash-badge-neutral' }

  return (
    <li className="dash-card flex flex-col gap-1 rounded-md border px-2.5 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="dash-card-label dash-text min-w-0 text-sm">{featureLabel(f)}</div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${className}`}
        >
          {label}
        </span>
      </div>
      <div className="dash-accent-text text-right font-mono text-sm">
        {busy ? (
          <Skeleton />
        ) : (
          <>
            {text}
            {unit ? (
              <span className="dash-muted ml-1 text-xs">{unit}</span>
            ) : null}
          </>
        )}
      </div>
    </li>
  )
}

function DerivedRow({
  title: rowTitle,
  value,
  unit,
  busy,
  kind,
}: {
  title: string
  value: number
  unit: string
  busy: boolean
  kind: 'kwh' | 'ghg' | 'cost'
}) {
  const { label: band, className } =
    kind === 'kwh'
      ? derivedIntensityLevel(value)
      : kind === 'ghg'
        ? ghgOrCostLevel(value, 50)
        : ghgOrCostLevel(value, 25)
  const frac =
    kind === 'kwh' ? derivedMetricBarFraction(value, DEFAULT_REFERENCE_EUI_KWH_M2) : 0

  return (
    <li className="dash-card flex flex-col gap-1 rounded-md border px-2.5 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="dash-card-label dash-text min-w-0 text-sm">{rowTitle}</div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${className}`}
        >
          {band}
        </span>
      </div>
      {kind === 'kwh' && !busy && Number.isFinite(value) ? (
        <div
          className="dash-track h-1 w-full overflow-hidden rounded"
          title="Relative to a simple reference intensity for this view"
        >
          <div
            className="dash-bar h-full rounded"
            style={{ width: `${frac * 100}%` }}
          />
        </div>
      ) : null}
      <div className="dash-accent-text text-right font-mono text-sm">
        {busy ? (
          <Skeleton />
        ) : (
          <>
            {Number.isFinite(value) ? value.toFixed(2) : '—'}
            <span className="dash-muted ml-1 text-xs">{unit}</span>
          </>
        )}
      </div>
    </li>
  )
}

const ENERGY_MODES: EnergyDisplayUnit[] = ['J', 'kWh', 'MWh']

/** Comparison gets `ml-auto` at render time — it compares two designs rather than
 * exploring inputs, so it's visually set apart from the rest on the far right. */
const VISUALIZATION_VIEWS = [
  { id: 'all-inputs', label: 'All Inputs' },
  { id: 'sensitivity', label: 'Sensitivity' },
  { id: 'tornado', label: 'Tornado' },
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'comparison', label: 'Comparison' },
] as const

type VisualizationView = (typeof VISUALIZATION_VIEWS)[number]['id']

export function OutputReadoutPane({
  surrogateId,
  features,
  outputs,
  isOutputUpdating,
  isPredicting,
  predictError,
  tfModel,
  valueMap,
  inferenceWasSlow,
  model,
  inputFeatures,
}: OutputReadoutPaneProps) {
  const [energyMode, setEnergyMode] = useState<EnergyDisplayUnit>('kWh')
  const [visualizationView, setVisualizationView] =
    useState<VisualizationView>('all-inputs')
  /** Set only by an All Inputs tile click; cleared when the Sensitivity tab is clicked directly. */
  const [sensitivityFocus, setSensitivityFocus] = useState<{
    inputId: string
    outputSelection: OutputSelection
  } | null>(null)
  const busy = isOutputUpdating || isPredicting

  const handleTabClick = useCallback((id: VisualizationView) => {
    setVisualizationView(id)
    if (id === 'sensitivity') setSensitivityFocus(null)
  }, [])

  const openInSensitivity = useCallback((inputId: string, outputSelection: OutputSelection) => {
    setSensitivityFocus({ inputId, outputSelection })
    setVisualizationView('sensitivity')
  }, [])

  const derived = useMemo(() => {
    if (!outputs || !supportsDerived(tfModel)) return null
    const jout = outputsRecordToJ(outputs)
    if (!jout) return null
    const ctx = contextRecordForDerived(mergeDerivedContext(tfModel, valueMap))
    return computeDerivedMetrics(jout, ctx)
  }, [outputs, tfModel, valueMap])

  const derivedLabels: Record<string, string> = {
    TEDI: 'Thermal Energy Demand Intensity',
    CEDI: 'Cooling Energy Demand Intensity',
    EUI: 'Energy Use Intensity',
    GHGI: 'GHG Intensity',
    OPERATING_COST: 'Operating Cost',
  }

  return (
    <div
      className="min-w-0 space-y-2 "
      role="region"
      aria-label="Predicted outputs"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="dash-section-heading">Predicted Outputs</h3>
        <div className="flex flex-wrap items-center gap-2">
          {inferenceWasSlow ? (
            <span className="dash-warning text-[10px]">Slow run (&gt;1s)</span>
          ) : null}
          {busy ? (
            <span className="dash-warning text-xs">Updating…</span>
          ) : null}
          <div
            className="dash-control flex rounded border p-0.5 text-xs"
            role="group"
            aria-label="Energy display unit"
          >
            {(features.some(isJoules) ? ENERGY_MODES : []).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setEnergyMode(m)}
                className={
                  m === energyMode
                    ? 'dash-accent-bg rounded px-2 py-0.5'
                    : 'dash-tab px-2 py-0.5'
                }
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
      {predictError && (
        <p className="dash-error text-sm" role="alert">
          {predictError}
        </p>
      )}
      <div className="grid gap-6 2xl:grid-cols-[42rem_minmax(16rem,1fr)] 2xl:items-stretch">
        <div className="max-w-2xl 2xl:flex 2xl:flex-col">
          <div
            className="dash-control mb-2 flex w-full flex-wrap items-center gap-1 rounded border p-0.5 text-xs"
            role="tablist"
            aria-label="Visualization"
          >
            {VISUALIZATION_VIEWS.map((view) => (
              <button
                key={view.id}
                id={`visualization-tab-${view.id}`}
                type="button"
                role="tab"
                aria-selected={visualizationView === view.id}
                aria-controls={`visualization-panel-${view.id}`}
                onClick={() => handleTabClick(view.id)}
                className={
                  (visualizationView === view.id
                    ? 'dash-accent-bg rounded px-3 py-1'
                    : 'dash-tab rounded px-3 py-1') + (view.id === 'comparison' ? ' sm:ml-auto' : '')
                }
              >
                {view.label}
              </button>
            ))}
          </div>
          <div
            id={`visualization-panel-${visualizationView}`}
            role="tabpanel"
            aria-labelledby={`visualization-tab-${visualizationView}`}
            className="2xl:flex 2xl:flex-1 2xl:flex-col"
          >
            {visualizationView === 'all-inputs' ? (
              <OutputSmallMultiplesView
                surrogateId={surrogateId}
                model={model}
                tfModel={tfModel}
                inputFeatures={inputFeatures}
                outputFeatures={features}
                valueMap={valueMap}
                energyMode={energyMode}
                onOpenInSensitivity={openInSensitivity}
              />
            ) : visualizationView === 'sensitivity' ? (
              <OutputSensitivityChart
                surrogateId={surrogateId}
                model={model}
                tfModel={tfModel}
                inputFeatures={inputFeatures}
                outputFeatures={features}
                valueMap={valueMap}
                energyMode={energyMode}
                initialInputId={sensitivityFocus?.inputId}
                initialOutputSelection={sensitivityFocus?.outputSelection}
              />
            ) : visualizationView === 'tornado' ? (
              <OutputTornadoView
                surrogateId={surrogateId}
                model={model}
                tfModel={tfModel}
                inputFeatures={inputFeatures}
                outputFeatures={features}
                valueMap={valueMap}
                energyMode={energyMode}
              />
            ) : visualizationView === 'heatmap' ? (
              <OutputHeatmapView
                surrogateId={surrogateId}
                model={model}
                tfModel={tfModel}
                inputFeatures={inputFeatures}
                outputFeatures={features}
                valueMap={valueMap}
                energyMode={energyMode}
              />
            ) : (
              <OutputComparisonView
                model={model}
                tfModel={tfModel}
                inputFeatures={inputFeatures}
                outputFeatures={features}
                initialValues={valueMap}
                energyMode={energyMode}
              />
            )}
          </div>
        </div>
        <div className="space-y-2">
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-2">
            {features.map((f) => {
              const id = f.feature.id
              const v = outputs ? outputs[id] : undefined
              return (
                <EnergyOutputRow
                  key={id}
                  f={f}
                  j={v}
                  mode={energyMode}
                  busy={busy}
                />
              )
            })}
          </ul>

          {supportsDerived(tfModel) && <div>
            <h4 className="dash-subsection-heading mb-2">
              Derived Metrics
            </h4>
            <ul className="space-y-2">
              {DERIVED_ORDER.map(({ key }) => {
                const val = derived ? derived[key] : Number.NaN
                const unit =
                  key === 'GHGI' ? 'kgCO₂/m²' : key === 'OPERATING_COST' ? '$/m²' : 'kWh/m²'
                const k: 'kwh' | 'ghg' | 'cost' =
                  key === 'GHGI' ? 'ghg' : key === 'OPERATING_COST' ? 'cost' : 'kwh'
                return (
                  <DerivedRow
                    key={key}
                    title={derivedLabels[key] ?? key}
                    value={val}
                    unit={unit}
                    busy={busy}
                    kind={k}
                  />
                )
              })}
            </ul>
          </div>}
        </div>
      </div>
      <details className="dash-muted text-xs">
        <summary className="cursor-pointer">How Lower / Typical / Higher are assigned</summary>
        <p className="mt-2">These are fixed display thresholds, not measured building benchmarks or model confidence. Lower includes the lower boundary; Higher includes the upper boundary; Typical is strictly between them. Higher describes magnitude, not necessarily worse performance.</p>
        <ul className="mt-2 list-disc pl-4 space-y-1">
          <li>Energy outputs: Lower ≤ 5,000 kWh; Typical 5,000–500,000 kWh; Higher ≥ 500,000 kWh (also when displaying GJ).</li>
          <li>Energy intensities: Lower ≤ 30; Typical 30–120; Higher ≥ 120 kWh/m².</li>
          <li>GHG intensity: Lower ≤ 12.5; Typical 12.5–40; Higher ≥ 40 kgCO₂/m².</li>
          <li>Operating cost: Lower ≤ 6.25; Typical 6.25–20; Higher ≥ 20 $/m².</li>
        </ul>
      </details>
    </div>
  )
}
