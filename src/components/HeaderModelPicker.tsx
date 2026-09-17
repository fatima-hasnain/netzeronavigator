import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalogue } from '../hooks/useCatalogue'
import { cleanDisplayName, filterModels, normalizeArchetype } from '../lib/catalogue'

const MAX_RESULTS = 6

/**
 * Quick "jump to a model" tool in the header: pick an archetype and/or
 * location and matching models appear immediately, from any page. The full
 * catalogue (search, validation status, and all 484 records) still lives on
 * the home page's "Browse the catalogue" section — this is a shortcut to it,
 * not a replacement.
 */
export function HeaderModelPicker() {
  const [open, setOpen] = useState(false)
  const [archetype, setArchetype] = useState('')
  const [location, setLocation] = useState('')
  const state = useCatalogue()
  const models = useMemo(() => (state.status === 'success' ? state.models : []), [state])

  const archetypes = useMemo(() => [...new Set(models.map(m => normalizeArchetype(m.archetype)))].sort(), [models])
  const locations = useMemo(() => [...new Set(models.map(m => m.location))].sort(), [models])
  const matches = useMemo(
    () => (archetype || location ? filterModels(models, '', archetype, location, '') : []),
    [models, archetype, location],
  )

  return (
    <details
      className="relative"
      open={open}
      onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="dash-link inline-flex cursor-pointer list-none items-center gap-1">
        Models <span aria-hidden="true">▾</span>
      </summary>
      <div
        role="dialog"
        aria-label="Find a model"
        className="dash-panel absolute right-0 z-50 mt-2 w-80 rounded-lg border p-4 text-left shadow-lg"
      >
        <p className="dash-muted text-xs">Find a model by archetype and location</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select className="dash-select rounded border p-1.5 text-xs" value={archetype} onChange={e => setArchetype(e.target.value)} aria-label="Building archetype">
            <option value="">Any archetype</option>
            {archetypes.map(a => <option key={a}>{a}</option>)}
          </select>
          <select className="dash-select rounded border p-1.5 text-xs" value={location} onChange={e => setLocation(e.target.value)} aria-label="Location">
            <option value="">Any location</option>
            {locations.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
          {state.status === 'loading' && <p className="dash-muted text-xs">Loading catalogue…</p>}
          {state.status === 'success' && !archetype && !location && (
            <p className="dash-muted text-xs">Choose an archetype or location to see matching models.</p>
          )}
          {(archetype || location) && matches.length === 0 && <p className="dash-text text-xs">No models match.</p>}
          {matches.slice(0, MAX_RESULTS).map(m => (
            <Link
              key={m.id}
              to={'/s/' + encodeURIComponent(m.id)}
              onClick={() => setOpen(false)}
              className="dash-card flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs"
            >
              <span className="dash-text truncate">{cleanDisplayName(m.displayName)}</span>
              <span className="dash-chip shrink-0 rounded border px-1.5 py-0.5">{m.status === 'available' ? 'Ready' : 'Details'}</span>
            </Link>
          ))}
          {matches.length > MAX_RESULTS && (
            <p className="dash-muted text-xs">+{matches.length - MAX_RESULTS} more below.</p>
          )}
        </div>
        <Link to="/#models" onClick={() => setOpen(false)} className="dash-link mt-3 inline-block text-xs">
          Browse the full catalogue
        </Link>
      </div>
    </details>
  )
}
