import type { ManifestFeature } from '../types/manifest'
import { FeatureRow } from './FeatureRow'

export function FeatureTable({ features }: { features: ManifestFeature[] }) {
  if (features.length === 0) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-700 text-xs uppercase tracking-wide text-zinc-500">
            <th className="pb-2 pr-4">Label</th>
            <th className="pb-2 pr-4">Id</th>
            <th className="pb-2 pr-4">Units</th>
            <th className="pb-2 pr-4">Default</th>
            <th className="pb-2">Training range</th>
          </tr>
        </thead>
        <tbody>
          {features.map((f, i) => (
            <FeatureRow key={`${f.feature.id}-${i}`} feature={f} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
