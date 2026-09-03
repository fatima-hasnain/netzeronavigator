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
    <section className="dash-panel rounded-lg border p-3">
      <h3 className="dash-accent-text text-xs font-semibold uppercase tracking-wide">
        Model
      </h3>
      <p className="dash-muted mt-1 break-all font-mono text-[10px]">
        {modelJsonUrl}
      </p>
      {tfModel.selection && (
        <p className="dash-muted mt-1 text-xs">
          Selection: {JSON.stringify(tfModel.selection)}
        </p>
      )}
      {loadState.status === 'loading' && (
        <p className="dash-text mt-2 text-sm">Loading model…</p>
      )}
      {loadState.status === 'error' && (
        <p className="dash-error mt-2 text-sm">
          Failed to load: {loadState.error}
        </p>
      )}
      {loadState.status === 'ready' && (
        <p className="dash-ok mt-2 text-xs">Model ready</p>
      )}
    </section>
  )
}
