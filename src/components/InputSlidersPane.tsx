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
import { EXPLORATION_DEBOUNCE_MS } from '../hooks/useSurrogateExploration'
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
      className="rounded border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-1.5 sm:px-3"
    >
      <div className="flex items-center gap-1.5">
        <div
          className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200"
          title={t(id)}
        >
          {t(id)}
        </div>
        <input
          type="number"
          className={`w-24 shrink-0 rounded border bg-zinc-950 px-1.5 py-0.5 font-mono text-sm text-zinc-100 ${
            oob
              ? 'border-amber-500/80'
              : 'border-zinc-700'
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
          aria-label={`${t(id)} value${unitShown ? ` (${unitShown})` : ''}`}
        />
        {unitShown ? (
          <span className="shrink-0 text-xs text-zinc-500">
            [<span className="text-zinc-400">{unitShown}</span>]
          </span>
        ) : null}
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-sm text-amber-500/90 hover:bg-zinc-800/80"
          title={info}
          aria-label={`Details for ${t(id)}`}
        >
          ⓘ
        </button>
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-1">
        <span className="w-9 shrink-0 text-[10px] text-zinc-500 sm:text-[10px]">
          {dMin.text}
        </span>
        <div className="min-w-0 flex-1">
          <input
            id={rangeId}
            type="range"
            className="w-full accent-amber-500"
            min={min}
            max={max}
            step={rangeStepFinal}
            value={vForSlider}
            aria-label={`${t(id)} (${unitShown || t(id)})`}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            onInput={(e) => {
              const n = parseFloat((e.target as HTMLInputElement).value)
              if (!Number.isNaN(n)) onChange(id, n)
            }}
          />
        </div>
        <span className="w-9 shrink-0 text-right text-[10px] text-zinc-500">
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
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.title, true])),
  )

  return (
    <div className="min-w-0 pr-1">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-100">Inputs (tensor)</h3>
        <button
          type="button"
          onClick={onResetToDefaults}
          className="rounded border border-zinc-600 px-2.5 py-1 text-xs text-zinc-200 hover:border-zinc-500"
        >
          Reset all to defaults
        </button>
      </div>
      <p className="mb-4 text-xs text-zinc-500">
        Adjust inputs; outputs update after {EXPLORATION_DEBOUNCE_MS} ms
        debounce. Training bounds
        are shown on each slider; values can still be set outside the range
        (highlighted in amber).
      </p>
      <div className="space-y-2">
        {groups.map((g) => {
          const expanded = open[g.title] !== false
          return (
            <div
              key={g.title}
              className="rounded border border-zinc-800/50 bg-zinc-950/30"
            >
              <button
                type="button"
                onClick={() =>
                  setOpen((o) => ({ ...o, [g.title]: !expanded }))
                }
                className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-sm font-medium text-zinc-200"
                aria-expanded={expanded}
              >
                <span>{g.title}</span>
                <span className="text-zinc-500">{expanded ? '−' : '+'}</span>
              </button>
              {expanded ? (
                <ul
                  className="grid list-none grid-cols-1 gap-2 border-t border-zinc-800/50 px-2.5 py-2 min-[640px]:grid-cols-2"
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
