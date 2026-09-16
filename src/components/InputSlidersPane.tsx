import { featureLabel } from '../lib/modelDisplay'
import { useId, useMemo, useState } from 'react'
import {
  decimalPlacesForFeatureId,
  formatDisplayNumber,
  stepForFeatureId,
} from '../lib/displayFormat'
import { groupTensorInputs } from '../lib/sliderSections'
import {
  displayToModelFlow,
  modelStepForFlowInput,
  modelToDisplayFlow,
  displayUnitForFlowInput,
  isDhwId,
  isFlowPerM2,
} from '../lib/inputModelDisplay'
import { normalizeUnitLabel } from '../lib/unitNormalize'
import { sliderBoundsForFeature } from '../lib/sliderBounds'
import { t } from '../i18n/t'
import type { ManifestFeature } from '../types/manifest'

function numberStepModel(id: string): number {
  const flow = modelStepForFlowInput(id, decimalPlacesForFeatureId(id))
  if (Number.isFinite(flow)) {
    return flow
  }
  return Math.pow(10, -decimalPlacesForFeatureId(id))
}

function toDisplay(
  id: string,
  model: number,
): { text: string; n: number } {
  if (isDhwId(id) || isFlowPerM2(id)) {
    const n = modelToDisplayFlow(id, model)
    return { text: formatDisplayNumber(n, id), n }
  }
  return { text: formatDisplayNumber(model, id), n: model }
}

function outOfTraining(
  v: number,
  min: number,
  max: number,
  eps: number = 1e-9,
): boolean {
  return v < min - eps || v > max + eps
}

function SliderCard({
  f,
  value,
  onChange,
  baseId,
}: {
  f: ManifestFeature
  value: number
  onChange: (id: string, value: number) => void
  baseId: string
}) {
  const id = f.feature.id
  const { min, max } = sliderBoundsForFeature(f, value)
  const vForSlider = Math.min(max, Math.max(min, value))
  const oob = outOfTraining(value, min, max)
  const dMin = toDisplay(id, min)
  const dMax = toDisplay(id, max)
  const dVal = toDisplay(id, value)
  const numMin = isDhwId(id) || isFlowPerM2(id) ? dMin.n : min
  const numMax = isDhwId(id) || isFlowPerM2(id) ? dMax.n : max
  const span = max - min
  const coarse = span > 0 ? span / 1000 : 0
  const rangeStepFinal = String(
    Math.max(coarse, numberStepModel(id), 1e-12),
  )
  const unitBase = f.units ? t(f.units) : ''
  const displayUnit = displayUnitForFlowInput(f.feature.id, unitBase)
  const unitShown = displayUnit
    ? normalizeUnitLabel(displayUnit) || displayUnit
    : normalizeUnitLabel(f.units) || ''

  const info = `ID: ${id}
Training: ${dMin.text} – ${dMax.text} ${unitShown}
${f.description && typeof f.description === 'string' ? f.description : f.notes && typeof f.notes === 'string' ? f.notes : ''}`.trim()

  const rangeId = `${baseId}-range-${id}`

  return (
    <li
      className="dash-card min-w-0 rounded border px-2.5 py-2.5 sm:px-3"
    >
      {/* Row 1: full label + help, with value and unit right-aligned. */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-1 items-baseline gap-1">
          <div className="dash-card-label dash-text text-sm font-medium">{featureLabel(f)}</div>
          <button
            type="button"
            className="dash-accent-text shrink-0 rounded p-0.5 text-sm hover:opacity-80"
            title={info}
            aria-label={`Details for ${featureLabel(f)}`}
          >
            ⓘ
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            type="number"
            className={`dash-control w-24 rounded border px-2 py-1 font-mono text-sm ${
              oob
                ? 'dash-oob'
                : ''
            }`}
            min={numMin}
            max={numMax}
            step={stepForFeatureId(id)}
            value={dVal.text}
            onChange={(e) => {
              const raw = e.target.value
              const p = parseFloat(raw)
              if (Number.isNaN(p)) return
              onChange(
                id,
                isDhwId(id) || isFlowPerM2(id) ? displayToModelFlow(id, p) : p,
              )
            }}
            title={oob ? 'Value outside training range' : undefined}
            aria-invalid={oob}
            aria-label={`${featureLabel(f)} value${unitShown ? ` (${unitShown})` : ''}`}
          />
          {unitShown ? (
            <span className="dash-muted text-xs">
              [<span className="dash-text">{unitShown}</span>]
            </span>
          ) : null}
        </div>
      </div>
      {/* Row 2: track spans the card, training bounds pinned to each end. */}
      <div className="mt-2 flex w-full min-w-0 items-center gap-2">
        <span className="dash-muted shrink-0 text-[10px] tabular-nums">
          {dMin.text}
        </span>
        <input
          id={rangeId}
          type="range"
          className="dash-range min-w-0 flex-1"
          min={min}
          max={max}
          step={rangeStepFinal}
          value={vForSlider}
          aria-label={`${featureLabel(f)} (${unitShown || t(id)})`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onInput={(e) => {
            const n = parseFloat((e.target as HTMLInputElement).value)
            if (!Number.isNaN(n)) onChange(id, n)
          }}
        />
        <span className="dash-muted shrink-0 text-right text-[10px] tabular-nums">
          {dMax.text}
        </span>
      </div>
    </li>
  )
}

export interface InputSlidersPaneProps {
  features: ManifestFeature[]
  values: Record<string, number>
  onChange: (id: string, value: number) => void
  onResetToDefaults: () => void
}

export function InputSlidersPane({
  features,
  values,
  onChange,
  onResetToDefaults,
}: InputSlidersPaneProps) {
  const baseId = useId()
  const groups = useMemo(() => groupTensorInputs(features), [features])
  // Default open — a first-time visitor should see draggable sliders immediately,
  // not a wall of collapsed accordions with nothing to interact with.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.title, true])),
  )
  const allExpanded = groups.length > 0 && groups.every((g) => open[g.title] === true)

  return (
    <div className="min-w-0 pr-1">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="dash-section-heading">Building Design Inputs</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setOpen(
                Object.fromEntries(groups.map((g) => [g.title, !allExpanded])),
              )
            }
            className="dash-control rounded border px-2.5 py-1 text-xs"
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>
          <button
            type="button"
            onClick={onResetToDefaults}
            className="dash-control rounded border px-2.5 py-1 text-xs"
          >
            Reset all to defaults
          </button>
        </div>
      </div>
      <p className="dash-muted mb-4 text-xs">
        Adjust the building design inputs to see how predicted performance changes.
        Each slider shows the model’s training range. Values outside that range are highlighted in amber.
      </p>
      <div className="space-y-2">
        {groups.map((g) => {
          const expanded = open[g.title] === true
          return (
            <div
              key={g.title}
              className="dash-group rounded border"
            >
              <button
                type="button"
                onClick={() =>
                  setOpen((o) => ({ ...o, [g.title]: !expanded }))
                }
                className="dash-text flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-sm font-medium"
                aria-expanded={expanded}
              >
                <span>
                  {g.title}{' '}
                  <span className="dash-muted text-xs font-normal">
                    · {g.items.length} {g.items.length === 1 ? 'input' : 'inputs'}
                  </span>
                </span>
                <span className="dash-muted">{expanded ? '−' : '+'}</span>
              </button>
              {expanded ? (
                <ul
                  className="dash-divider grid list-none grid-cols-1 gap-2 border-t px-2.5 py-2"
                  style={{ maxWidth: '100%' }}
                >
                  {g.items.map((f) => {
                    const id = f.feature.id
                    return (
                      <SliderCard
                        key={id}
                        f={f}
                        value={values[id] ?? 0}
                        onChange={onChange}
                        baseId={baseId}
                      />
                    )
                  })}
                </ul>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
