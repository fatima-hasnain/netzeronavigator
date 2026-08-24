import { t } from '../i18n/t'
import type { ManifestFeature } from '../types/manifest'

const LABELS: Record<string, string> = {
  HVAC_DELIVERY_SYSTEM_TYPE: 'HVAC system',
  HVAC_PLANT_TYPE: 'Plant type',
}

export interface ConfigurationBarProps {
  features: ManifestFeature[]
  activeSelection: Record<string, string>
  options: Record<string, string[]>
  onChange: (id: string, value: string) => void
  noAlternatives: boolean
}

/**
 * P2: one &lt;select&gt; per exterior-selection variable, above the slider grid.
 */
export function ConfigurationBar({
  features,
  activeSelection,
  options,
  onChange,
  noAlternatives,
}: ConfigurationBarProps) {
  if (features.length === 0) return null
  return (
    <div className="mb-4 flex flex-wrap items-end gap-4 border-b border-zinc-800/60 pb-4">
      {features.map((f) => {
        const id = f.feature.id
        const opts = options[id] ?? []
        const v = activeSelection[id] ?? ''
        const label = LABELS[id] ?? t(id)
        return (
          <div key={id} className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-400" htmlFor={`cfg-${id}`}>
              {label}
            </label>
            <select
              id={`cfg-${id}`}
              className="w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
              value={v}
              onChange={(e) => onChange(id, e.target.value)}
              disabled={noAlternatives && opts.length <= 1}
              aria-label={label}
            >
              {opts.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {noAlternatives && opts.length <= 1 ? (
              <p className="mt-1 text-[10px] text-zinc-500">
                Only this configuration is bundled for this model.
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
