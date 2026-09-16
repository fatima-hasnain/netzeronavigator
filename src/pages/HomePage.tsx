import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalogue } from '../hooks/useCatalogue'
import { cleanDisplayName, filterModels, normalizeArchetype, sourceBucket, type CatalogueModel } from '../lib/catalogue'

function ModelCard({ m }: { m: CatalogueModel }) {
  return (
    <article className="dash-card flex h-full flex-col rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="dash-heading font-semibold">{cleanDisplayName(m.displayName)}</h3>
        <span className="dash-chip shrink-0 rounded border px-2 py-1 text-xs">{m.status === 'available' ? 'Prediction ready' : 'Details only'}</span>
      </div>
      <p className="dash-text mt-2 text-sm">{m.archetype} | {m.location}</p>
      <p className="dash-muted mt-1 text-xs">Version {m.version} | {m.inputCount ?? '?'} inputs | {m.outputCount ?? '?'} outputs | {m.format}</p>
      <p className="dash-muted mt-2 text-xs">Outputs: {m.outputNames.length ? m.outputNames.join(', ') : 'Names unavailable in source metadata'}</p>
      {m.recovery && <details className="dash-text mt-2 text-xs"><summary className="cursor-pointer">Metadata reconstructed - unverified</summary><p className="mt-2">{m.recovery.summary}</p><p className="dash-muted mt-1">{m.recovery.rawInputCount} user parameters; sampling design: {m.recovery.totalSamples.toLocaleString()} samples. Output meanings are known; column order and units are not yet confirmed.</p></details>}
      <div className="mt-auto pt-3">
        {m.status === 'available' ? <p className="dash-muted text-xs">Validation: {m.validationStatus.replaceAll('-', ' ')}</p> : <p className="dash-warning text-xs">{m.reasons.join(' | ')}</p>}
        <Link className="dash-btn mt-3 inline-block rounded px-3 py-1.5 text-sm" to={'/s/' + encodeURIComponent(m.id)}>{m.status === 'available' ? 'Open Explorer' : 'Open model'}</Link>
      </div>
    </article>
  )
}

function ArchivePicker({ models }: { models: CatalogueModel[] }) {
  const [search, setSearch] = useState('')
  const [archetype, setArchetype] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('')
  const matches = filterModels(models, search, archetype, location, status)
  const options = (field: 'archetype' | 'location') =>
    [...new Set(models.map(m => (field === 'archetype' ? normalizeArchetype(m[field]) : m[field])))].sort()
  const counts = models.reduce<Record<string, number>>((acc, m) => {
    const key = sourceBucket(m)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return (
    <details className="mt-10">
      <summary className="dash-link cursor-pointer text-sm font-medium">
        Show the other {models.length} trained models
      </summary>
      <p className="dash-muted mt-2 text-xs">
        {Object.entries(counts).map(([label, n]) => `${n} ${label}`).join(' | ')} - details only, no live predictions yet.
      </p>
      <div className="my-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="dash-text text-sm">Search model name<input className="dash-input mt-1 w-full rounded border p-2" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search models..." /></label>
        <label className="dash-text text-sm">Building archetype<select className="dash-input mt-1 w-full rounded border p-2" value={archetype} onChange={e => setArchetype(e.target.value)}><option value="">All archetypes</option>{options('archetype').map(v => <option key={v}>{v}</option>)}</select></label>
        <label className="dash-text text-sm">Location<select className="dash-input mt-1 w-full rounded border p-2" value={location} onChange={e => setLocation(e.target.value)}><option value="">All locations</option>{options('location').map(v => <option key={v}>{v}</option>)}</select></label>
        <label className="dash-text text-sm">Availability / validation<select className="dash-input mt-1 w-full rounded border p-2" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option value="available">Prediction ready</option><option value="unavailable">Details only</option><option value="reconstructed-unverified">Reconstructed - unverified</option><option value="sample-checked">Sample checked</option><option value="runtime-checked">Runtime checked</option><option value="unverified">Unverified</option></select></label>
      </div>
      <p role="status" className="dash-muted mb-4 text-sm">{matches.length} of {models.length} models match these filters</p>
      {!matches.length && <p className="dash-text">No models match these filters. Try another search or select All archetypes and All locations.</p>}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {matches.map(m => <ModelCard key={m.id} m={m} />)}
      </div>
    </details>
  )
}

export default function HomePage() {
  const state = useCatalogue()
  const models = state.status === 'success' ? state.models : []
  const ready = models.filter(m => m.status === 'available')
  const archive = models.filter(m => m.status !== 'available')

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="dash-heading text-3xl font-semibold tracking-tight">Net Zero Navigator</h1>
      <p className="dash-text mt-4">Explore trained building-energy surrogate models: inspect inputs and outputs, sweep parameters, and compare designs interactively.</p>

      {state.status === 'loading' && <p role="status" className="dash-muted mt-8">Loading model catalogue...</p>}
      {state.status === 'error' && <div role="alert" className="dash-error mt-8">{state.error}<button className="dash-link ml-3" onClick={() => window.location.reload()}>Retry</button></div>}

      {state.status === 'success' && <>
        <section className="mt-8" aria-labelledby="catalogue-title">
          <h2 id="catalogue-title" className="dash-heading text-xl font-semibold">Ready to explore</h2>
          <p className="dash-muted mt-1 text-sm">{ready.length} surrogate model{ready.length === 1 ? '' : 's'} with live, interactive predictions.</p>
          {!ready.length && <p className="dash-text mt-4">No prediction-ready models are published yet.</p>}
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ready.map(m => <ModelCard key={m.id} m={m} />)}
          </div>
        </section>

        {archive.length > 0 && <ArchivePicker models={archive} />}
      </>}
    </div>
  )
}
