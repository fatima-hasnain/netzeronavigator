import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export interface ExpandableChartProps {
  title: string
  children: ReactNode
  /** Shown as "Open in new tab" beside Expand chart when provided. */
  onOpenNewTab?: () => void
}

/** Reuses the plotted data and labels in a keyboard-accessible native modal. */
export function ExpandableChart({ title, children, onOpenNewTab }: ExpandableChartProps) {
  const [expanded, setExpanded] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!expanded) return
    const element = dialog.current!
    const triggerElement = trigger.current
    element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = overflow
      triggerElement?.focus()
    }
  }, [expanded])
  return <>
    <div className="mt-2 flex justify-end gap-2">
      {onOpenNewTab ? (
        <button type="button" className="dash-control rounded border px-2.5 py-1 text-xs" onClick={onOpenNewTab}>Open in new tab</button>
      ) : null}
      <button ref={trigger} type="button" className="dash-control rounded border px-2.5 py-1 text-xs" aria-haspopup="dialog" onClick={() => setExpanded(true)}>Expand chart</button>
    </div>
    <div className="chart-inline">{children}</div>
    {expanded && <dialog ref={dialog} className="chart-modal dash-panel" aria-labelledby={titleId}
      onCancel={() => setExpanded(false)} onClose={() => setExpanded(false)}
      onClick={event => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setExpanded(false)
      }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={titleId} className="dash-section-heading">{title}</h2>
        <button type="button" autoFocus className="dash-control rounded border px-3 py-1.5 text-sm" onClick={() => setExpanded(false)}>Close chart</button>
      </div>
      {children}
    </dialog>}
  </>
}
