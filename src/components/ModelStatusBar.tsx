import { useState } from 'react'
import type { TfModel } from '../types/manifest'
import type { TfModelLoadState } from '../hooks/useTfModel'

export interface ModelStatusBarProps {
  modelJsonUrl: string
  loadState: TfModelLoadState
  /** Full selection JSON; omitted in compact mode unless expanded. */
  tfModel: TfModel
  /** P2: one-line with dot + text; `details` adds expandable path/selection. */
  variant?: 'compact' | 'details'
}

/**
 * P2 compact model status: dot + one line; full path/JSON only when expanded or
 * in `details` mode (Model Info tab).
 */
export function ModelStatusBar({
  modelJsonUrl,
  loadState,
  tfModel,
  variant = 'compact',
}: ModelStatusBarProps) {
  const [expanded, setExpanded] = useState(false)
  const showPath = variant === 'details' || expanded

  const stateDot =
    loadState.status === 'error'
      ? 'dash-dot-error'
      : loadState.status === 'loading' || loadState.status === 'idle'
        ? 'dash-dot-busy'
        : 'dash-dot-ok'
  const label =
    loadState.status === 'error'
      ? `Error: ${loadState.error}`
      : loadState.status === 'ready'
        ? 'Model ready'
        : 'Loading model…'

  if (loadState.status === 'error' && loadState.error) {
    // P2: expand to show error detail
    return (
      <div className="dash-error-panel rounded border px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${stateDot}`}
            aria-hidden
          />
          {label}
        </div>
        {showPath ? (
          <p className="dash-muted mt-2 break-all font-mono text-xs">
            {modelJsonUrl}
          </p>
        ) : null}
        <button
          type="button"
          className="dash-link mt-1 text-xs underline"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Hide detail' : 'Show detail'}
        </button>
      </div>
    )
  }

  return (
    <div className="dash-card rounded border px-3 py-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="dash-text flex items-center gap-2 text-sm">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${stateDot}`}
            title={loadState.status}
            aria-hidden
          />
          {label}
        </div>
        {variant === 'compact' && loadState.status === 'ready' ? (
          <button
            type="button"
            className="dash-tab text-xs"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
        ) : null}
      </div>
      {showPath && loadState.status === 'ready' && (
        <>
          <p className="dash-muted mt-1 break-all font-mono text-[10px]">
            {modelJsonUrl}
          </p>
          {tfModel.selection && (
            <p className="dash-muted mt-0.5 text-xs">Selection JSON in Model Info tab</p>
          )}
        </>
      )}
    </div>
  )
}
