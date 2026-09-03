import { useMemo, useState } from 'react'
import { t } from '../i18n/t'
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
import { formatEnergy, type EnergyDisplayUnit } from '../lib/volumeConversion'
import { OutputSensitivityChart } from './OutputSensitivityChart'
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
      : formatEnergy(j, mode, 'en-CA')
  const { label, className } =
    j !== undefined && Number.isFinite(j)
      ? energyOutputLevelJ(j)
      : { label: '—', className: 'dash-badge-neutral' }

  return (
    <li className="dash-card flex flex-col gap-1 rounded-md border px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="dash-text min-w-0 text-sm">{t(f.feature.id)}</div>
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
    <li className="dash-card flex flex-col gap-1 rounded-md border px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="dash-text min-w-0 text-sm">{rowTitle}</div>
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

export function OutputReadoutPane({
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
  const busy = isOutputUpdating || isPredicting

  const derived = useMemo(() => {
    if (!outputs) return null
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
      className="min-w-0 space-y-4 pl-1 lg:sticky lg:top-4 lg:self-start"
      role="region"
      aria-label="Predicted outputs"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="dash-heading text-sm font-semibold">Predicted Outputs</h3>
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
            {ENERGY_MODES.map((m) => (
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
      <OutputSensitivityChart
        model={model}
        tfModel={tfModel}
        inputFeatures={inputFeatures}
        outputFeatures={features}
        valueMap={valueMap}
        energyMode={energyMode}
      />
      <ul className="max-h-[min(70vh,40rem)] space-y-2 overflow-y-auto pr-1">
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

      <div>
        <h4 className="dash-muted mb-2 text-xs font-semibold uppercase tracking-wide">
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
      </div>
    </div>
  )
}
