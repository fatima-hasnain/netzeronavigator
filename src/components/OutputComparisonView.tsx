import { featureLabel, formatModelOutput, supportsDerived } from '../lib/modelDisplay'
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import type { LayersModel } from '@tensorflow/tfjs'
import {
  computeDerivedMetrics,
  contextRecordForDerived,
  mergeDerivedContext,
  outputsRecordToJ,
} from '../lib/derivedMetrics'
import { stepForFeatureId } from '../lib/displayFormat'
import { normalizeUnitLabel } from '../lib/unitNormalize'
import { formatChartNumber } from '../lib/chartNumberFormat'
import { type EnergyDisplayUnit } from '../lib/volumeConversion'
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

const RADAR_SHORT_LABEL: Record<string, string> = {
  TEDI: 'TEDI',
  CEDI: 'CEDI',
  EUI: 'EUI',
  GHGI: 'GHGI',
  OPERATING_COST: 'Cost',
}

// Fixed, theme-independent identity pair for the two designs — same approach as
// the sensitivity chart's slope colour — chosen for max distinguishability and to
// avoid the accent/ok/warning/error hues already in use elsewhere in this panel.
const DESIGN_A_COLOR = '#5b9bd8'
const DESIGN_B_COLOR = '#e8935a'

/**
 * Radar/star plot: Design A vs Design B across the five derived metrics. Each axis
 * is normalized independently (0 → that axis's own max across A/B, +15% headroom)
 * since the metrics don't share units — a shared scale would flatten four axes to
 * read the fifth. Each axis is labelled with its real 0–max range so the
 * independent scaling is never implicit.
 */
function DesignRadarChart({
  derivedA,
  derivedB,
}: {
  derivedA: Record<string, number>
  derivedB: Record<string, number>
}) {
  const size = 260
  const center = size / 2
  const radius = 82
  const labelRadius = radius * 1.3
  const axisCount = DERIVED_METRICS.length

  const axes = DERIVED_METRICS.map(([key, , unit], i) => {
    const aValue = Number.isFinite(derivedA[key]) ? derivedA[key] : 0
    const bValue = Number.isFinite(derivedB[key]) ? derivedB[key] : 0
    const trueMax = Math.max(aValue, bValue, 0)
    const axisMax = trueMax > 0 ? trueMax * 1.15 : 1
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axisCount
    return { key, unit, angle, aValue, bValue, trueMax, axisMax }
  })

  const pointFor = (angle: number, frac: number) => {
    const r = radius * Math.max(0, Math.min(1, frac))
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
  }

  const polygonPoints = (series: 'aValue' | 'bValue') =>
    axes
      .map((axis) => {
        const { x, y } = pointFor(axis.angle, axis[series] / axis.axisMax)
        return `${x},${y}`
      })
      .join(' ')

  return (
    <div className="mb-3">
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: DESIGN_A_COLOR }} />
          <span className="dash-text">Design A</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: DESIGN_B_COLOR }} />
          <span className="dash-text">Design B</span>
        </span>
        <span className="dash-muted">Each axis scaled 0 → its own max — ranges differ per axis.</span>
      </div>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="radar-plot mx-auto block h-56 w-full max-w-[22rem]"
        role="img"
        aria-label="Radar chart comparing Design A and Design B across five derived metrics, each axis normalized independently to its own range"
      >
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <polygon
            key={frac}
            className="dash-chart-grid"
            fill="none"
            points={axes.map((axis) => {
              const { x, y } = pointFor(axis.angle, frac)
              return `${x},${y}`
            }).join(' ')}
          />
        ))}
        {axes.map((axis) => {
          const { x, y } = pointFor(axis.angle, 1)
          return <line key={axis.key} className="dash-chart-grid" x1={center} y1={center} x2={x} y2={y} />
        })}
        <polygon
          points={polygonPoints('aValue')}
          fill={DESIGN_A_COLOR}
          fillOpacity={0.18}
          stroke={DESIGN_A_COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <polygon
          points={polygonPoints('bValue')}
          fill={DESIGN_B_COLOR}
          fillOpacity={0.18}
          stroke={DESIGN_B_COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {axes.map((axis) => {
          const pa = pointFor(axis.angle, axis.aValue / axis.axisMax)
          const pb = pointFor(axis.angle, axis.bValue / axis.axisMax)
          return (
            <g key={axis.key}>
              <circle cx={pa.x} cy={pa.y} r={3} fill={DESIGN_A_COLOR} />
              <circle cx={pb.x} cy={pb.y} r={3} fill={DESIGN_B_COLOR} />
            </g>
          )
        })}
        {axes.map((axis) => {
          const cos = Math.cos(axis.angle)
          const sin = Math.sin(axis.angle)
          const lx = center + labelRadius * cos
          const ly = center + labelRadius * sin + (sin > 0.6 ? 6 : sin < -0.6 ? -2 : 0)
          const anchor = cos > 0.35 ? 'start' : cos < -0.35 ? 'end' : 'middle'
          return (
            <text key={axis.key} x={lx} y={ly} textAnchor={anchor} style={{ fontSize: 9 }}>
              <tspan x={lx} dy="0" fill="var(--dash-text)" fontWeight={600}>
                {RADAR_SHORT_LABEL[axis.key] ?? axis.key}
              </tspan>
              <tspan x={lx} dy="1.15em" fill="var(--dash-text-muted)">
                0–{formatChartNumber(axis.trueMax)} {axis.unit}
              </tspan>
            </text>
          )
        })}
      </svg>
    </div>
  )
}

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
      if (!outputs || !supportsDerived(tfModel)) return null
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

      {derived.a && derived.b ? (
        <DesignRadarChart derivedA={derived.a} derivedB={derived.b} />
      ) : null}

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
                    {featureLabel(feature)}{unit ? <span className="dash-muted ml-1 font-normal">[{unit}]</span> : null}
                  </th>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className="dash-control w-full rounded border px-2 py-1 font-mono"
                      step={stepForFeatureId(id)}
                      value={designA[id] ?? 0}
                      aria-label={`${featureLabel(feature)} for design A`}
                      onChange={(event) => update(setDesignA, id, event.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      className="dash-control w-full rounded border px-2 py-1 font-mono"
                      step={stepForFeatureId(id)}
                      value={designB[id] ?? 0}
                      aria-label={`${featureLabel(feature)} for design B`}
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
                const formattedA = formatModelOutput(a, feature, energyMode)
                const formattedB = formatModelOutput(b, feature, energyMode)
                const formattedDelta = formatModelOutput(b - a, feature, energyMode)
                return (
                  <tr key={id} className="dash-divider border-b">
                    <th className="dash-text px-2 py-1.5 text-left font-medium">{featureLabel(feature)}</th>
                    <td className="px-2 py-1.5 font-mono">{formattedA.text} <span className="dash-muted">{formattedA.unit}</span></td>
                    <td className="px-2 py-1.5 font-mono">{formattedB.text} <span className="dash-muted">{formattedB.unit}</span></td>
                    <td className="dash-accent-text px-2 py-1.5 font-mono">{formattedDelta.text} <span className="dash-muted">{formattedDelta.unit}</span></td>
                  </tr>
                )
              })}
              {(supportsDerived(tfModel) ? DERIVED_METRICS : []).map(([key, label, unit]) => {
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
