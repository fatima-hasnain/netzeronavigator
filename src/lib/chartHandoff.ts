/**
 * Bridges state too large for a URL (the full input value map) from an
 * "Open in new tab" click to the standalone chart page it opens. Session-scoped,
 * not meant to make the link shareable — the URL alone carries the shareable part
 * (surrogate, model, view, selection).
 */
const HANDOFF_KEY = 'nzn:chart-handoff'

export interface ChartHandoff {
  valueMap: Record<string, number>
  designA?: Record<string, number>
  designB?: Record<string, number>
}

export function writeChartHandoff(data: ChartHandoff): void {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(data))
  } catch {
    // Storage unavailable (private mode, quota) — the new tab falls back to defaults.
  }
}

export function readChartHandoff(): ChartHandoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY)
    return raw ? (JSON.parse(raw) as ChartHandoff) : null
  } catch {
    return null
  }
}
