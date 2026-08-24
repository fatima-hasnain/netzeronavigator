import type { TfModel } from '../types/manifest'
import type { TfModelLoadState } from '../hooks/useTfModel'

export interface TfjsModelStatusProps {
  modelJsonUrl: string
  loadState: TfModelLoadState
  tfModel: TfModel
}

/**
 * Model load lifecycle only: URL, selection metadata, loading/error/ready.
 * Pairs with `useSurrogateExploration` (single `useTfModel` for the page).
 */
export function TfjsModelStatus({
  modelJsonUrl,
  loadState,
  tfModel,
}: TfjsModelStatusProps) {
  return (
    <section className="rounded-lg border border-amber-800/30 bg-amber-950/15 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
        Model
      </h3>
      <p className="mt-1 break-all font-mono text-[10px] text-zinc-500">
        {modelJsonUrl}
      </p>
      {tfModel.selection && (
        <p className="mt-1 text-xs text-zinc-500">
          Selection: {JSON.stringify(tfModel.selection)}
        </p>
      )}
      {loadState.status === 'loading' && (
        <p className="mt-2 text-sm text-zinc-400">Loading model…</p>
      )}
      {loadState.status === 'error' && (
        <p className="mt-2 text-sm text-red-400">
          Failed to load: {loadState.error}
        </p>
      )}
      {loadState.status === 'ready' && (
        <p className="mt-2 text-xs text-emerald-500/90">Model ready</p>
      )}
    </section>
  )
}
