import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCatalogue } from '../hooks/useCatalogue'
import { cleanDisplayName, filterModels, humanizeOutputName, MAX_OUTPUT_NAMES_SHOWN, normalizeArchetype, sourceBucket, type CatalogueModel } from '../lib/catalogue'
import { SurrogateDiagram } from '../components/SurrogateDiagram'
import { SiteFooter } from '../components/SiteFooter'

const IBPSA_PAPER_URL = 'https://publications.ibpsa.org/proceedings/bs/2023/papers/bs2023_1394.pdf'
const MODEL_CATALOGUE_DOCS_URL = 'https://github.com/fatima-hasnain/netzeronavigator/blob/fatima-ui/docs/MODEL_CATALOGUE.md'

const EXPLORER_VIEWS = [
  { name: 'All Inputs', description: "See every input's effect on the outputs at a glance, then open any one for a closer look." },
  { name: 'Sensitivity', description: 'Sweep a single input across its full range while holding everything else fixed.' },
  { name: 'Tornado', description: 'Rank every input by how much it swings the outputs, from most to least influential.' },
  { name: 'Heatmap', description: 'See how two inputs interact by sweeping both at once across a colour grid.' },
  { name: 'Comparison', description: 'Compare two complete design configurations side by side.' },
]

function scrollToModels(e: MouseEvent) {
  e.preventDefault()
  document.getElementById('models')?.scrollIntoView({ behavior: 'smooth' })
}

/** One catalogue entry, used both in the always-visible "Ready to explore" grid
 * and inside the collapsed archive below it — same card either way, since the
 * only real difference between a prediction-ready and details-only model is
 * which state its own `status` field is in. */
function ModelCard({ m }: { m: CatalogueModel }) {
  const shownOutputs = m.outputNames.slice(0, MAX_OUTPUT_NAMES_SHOWN).map(humanizeOutputName)
  const moreOutputs = m.outputNames.length - shownOutputs.length
  return (
    <article className="dash-card flex h-full flex-col rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="dash-heading line-clamp-2 font-semibold">{cleanDisplayName(m.displayName)}</h3>
        <span className="dash-chip shrink-0 rounded border px-2 py-1 text-xs">{m.status === 'available' ? 'Prediction ready' : 'Details only'}</span>
      </div>
      <p className="dash-text mt-2 line-clamp-1 text-sm">{m.archetype} | {m.location}</p>
      <p className="dash-muted mt-1 line-clamp-1 text-xs">Version {m.version} | {m.inputCount ?? '?'} inputs | {m.outputCount ?? '?'} outputs | {m.format}</p>
      <p className="dash-muted mt-2 line-clamp-2 text-xs">
        Outputs: {shownOutputs.length ? shownOutputs.join(', ') : 'Names unavailable in source metadata'}
        {moreOutputs > 0 ? `, +${moreOutputs} more` : ''}
      </p>
      {m.recovery && <details className="dash-text mt-2 text-xs"><summary className="cursor-pointer">Metadata reconstructed - unverified</summary><p className="mt-2">{m.recovery.summary}</p><p className="dash-muted mt-1">{m.recovery.rawInputCount} user parameters; sampling design: {m.recovery.totalSamples.toLocaleString()} samples. Output meanings are known; column order and units are not yet confirmed.</p></details>}
      <div className="mt-auto pt-3">
        {m.status === 'available' ? <p className="dash-muted line-clamp-2 text-xs">Validation: {m.validationStatus.replaceAll('-', ' ')}</p> : <p className="dash-warning line-clamp-2 text-xs">{m.reasons.join(' | ')}</p>}
        <Link className="dash-btn mt-3 inline-block rounded px-3 py-1.5 text-sm" to={'/s/' + encodeURIComponent(m.id)}>{m.status === 'available' ? 'Open Explorer' : 'Open model'}</Link>
      </div>
    </article>
  )
}

/**
 * The filterable, collapsed-by-default list of every non-interactive catalogue
 * entry (raw exports still awaiting TF.js conversion, plus the reconstructed
 * archetype sweep). Collapsed rather than shown inline because these outnumber
 * the interactive models roughly 100 to 1 — rendering them all in the main grid
 * would bury the handful of models a visitor can actually predict with under an
 * essentially unbounded wall of "details only" cards. The per-source-bucket
 * counts in the summary line exist so that scale is still visible without
 * expanding: e.g. that most of these come from one large reconstructed sweep,
 * not 400+ independent training runs.
 */
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
        <label className="dash-text text-sm">Search model name<input className="dash-select mt-1 w-full rounded border p-2" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search models..." /></label>
        <label className="dash-text text-sm">Building archetype<select className="dash-select mt-1 w-full rounded border p-2" value={archetype} onChange={e => setArchetype(e.target.value)}><option value="">All archetypes</option>{options('archetype').map(v => <option key={v}>{v}</option>)}</select></label>
        <label className="dash-text text-sm">Location<select className="dash-select mt-1 w-full rounded border p-2" value={location} onChange={e => setLocation(e.target.value)}><option value="">All locations</option>{options('location').map(v => <option key={v}>{v}</option>)}</select></label>
        <label className="dash-text text-sm">Availability / validation<select className="dash-select mt-1 w-full rounded border p-2" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option value="available">Prediction ready</option><option value="unavailable">Details only</option><option value="reconstructed-unverified">Reconstructed - unverified</option><option value="sample-checked">Sample checked</option><option value="runtime-checked">Runtime checked</option><option value="unverified">Unverified</option></select></label>
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
  const location = useLocation()
  useEffect(() => {
    if (!location.hash) return
    document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' })
  }, [location.hash])

  const state = useCatalogue()
  const models = state.status === 'success' ? state.models : []
  const ready = models.filter(m => m.status === 'available')
  const archive = models.filter(m => m.status !== 'available')

  return (
    <div>
      <section id="hero" className="mx-auto max-w-6xl px-4 pt-16 pb-14">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div>
            <h1 className="dash-heading text-4xl font-semibold tracking-tight sm:text-5xl">Net Zero Navigator</h1>
            <p className="dash-text mt-4 max-w-xl text-lg">
              Explore trained building-energy surrogate models: inspect inputs and outputs, sweep parameters, and compare designs interactively.
            </p>
            <a
              href="#models"
              onClick={scrollToModels}
              className="dash-btn mt-6 inline-block rounded px-5 py-2.5 text-sm font-medium"
            >
              Explore the models
            </a>
          </div>
          <SurrogateDiagram className="w-full max-w-md justify-self-center lg:justify-self-end" />
        </div>
      </section>

      <section id="about" style={{ background: 'var(--dash-surface)' }} className="dash-divider border-y">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="dash-heading text-2xl font-semibold">What is Net Zero Navigator?</h2>
          <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="dash-text max-w-2xl space-y-4 text-[15px] leading-relaxed">
              <p>
                Net Zero Navigator is an exploratory design tool for building energy performance. It lets architects and
                engineers see how design choices - envelope, glazing, HVAC, and more - affect a building's energy use,
                before any of those choices are locked in.
              </p>
              <p>
                Underneath each model is a <strong>surrogate</strong>: a neural network trained to imitate a detailed
                EnergyPlus simulation. Once trained, it predicts in milliseconds what EnergyPlus would take minutes to
                compute, which is what makes moving a slider and watching the outputs update in real time possible.
              </p>
              <p className="dash-muted text-sm">
                Read more in the{' '}
                <a className="dash-link" href={IBPSA_PAPER_URL} target="_blank" rel="noreferrer">2023 IBPSA paper</a>.
                {' '}Most catalogue entries below are currently metadata-only, pending output-scale validation - see{' '}
                <a className="dash-link" href={MODEL_CATALOGUE_DOCS_URL} target="_blank" rel="noreferrer">the model catalogue docs</a>.
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-4 lg:grid-cols-1">
              {[
                ['14', 'building archetypes'],
                ['20', 'Canadian weather locations'],
                ['39', 'design parameters'],
              ].map(([n, label]) => (
                <div key={label}>
                  <dt className="dash-accent-text text-3xl font-semibold">{n}</dt>
                  <dd className="dash-muted mt-1 text-xs">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section id="capabilities" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="dash-heading text-2xl font-semibold">What the explorer can do</h2>
        <p className="dash-muted mt-1 text-sm">Every prediction-ready model opens into the same five views.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {EXPLORER_VIEWS.map((view, i) => (
            <div key={view.name} className="dash-card flex h-full flex-col rounded-lg border p-4">
              <span className="dash-accent-text text-xs font-semibold">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="dash-heading mt-2 font-semibold">{view.name}</h3>
              <p className="dash-muted mt-1 text-sm">{view.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="models" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="dash-heading text-2xl font-semibold">Browse the catalogue</h2>

        {state.status === 'loading' && <p role="status" className="dash-muted mt-8">Loading model catalogue...</p>}
        {state.status === 'error' && <div role="alert" className="dash-error mt-8">{state.error}<button className="dash-link ml-3" onClick={() => window.location.reload()}>Retry</button></div>}

        {state.status === 'success' && <>
          <section className="mt-8" aria-labelledby="catalogue-title">
            <h3 id="catalogue-title" className="dash-heading text-xl font-semibold">Ready to explore</h3>
            <p className="dash-muted mt-1 text-sm">{ready.length} surrogate model{ready.length === 1 ? '' : 's'} with live, interactive predictions.</p>
            {!ready.length && <p className="dash-text mt-4">No prediction-ready models are published yet.</p>}
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {ready.map(m => <ModelCard key={m.id} m={m} />)}
            </div>
          </section>

          {archive.length > 0 && <ArchivePicker models={archive} />}
        </>}
      </section>

      <SiteFooter />
    </div>
  )
}
