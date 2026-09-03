import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FeatureTable } from '../components/FeatureTable'
import { SurrogateExploration } from '../components/SurrogateExploration'
import { tfModelJsonUrl } from '../lib/assetUrls'
import {
  allSelectionKeys,
  findTfIndexBySelection,
  getSelectionFromModel,
} from '../lib/tfModelSelection'
import { useManifest } from '../hooks/useManifest'
import type { Manifest, TfModel } from '../types/manifest'
import { groupFeaturesByKind } from '../lib/groupFeatures'

const SECTIONS: { kind: string; title: string }[] = [
  { kind: 'exterior-context', title: 'Exterior context' },
  { kind: 'exterior-selection', title: 'Exterior selection' },
  { kind: 'surrogate-input', title: 'Surrogate inputs' },
  { kind: 'surrogate-output', title: 'Surrogate outputs' },
  { kind: 'derived-output', title: 'Derived outputs' },
]

function SurrogateBody({ surrogateId }: { surrogateId: string }) {
  const state = useManifest(surrogateId)

  if (state.status === 'loading') {
    return (
      <div className="dash-text p-8">
        Loading manifest for <span className="font-mono">{surrogateId}</span>…
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="p-8">
        <p className="dash-error">Failed to load manifest: {state.error}</p>
        <Link className="dash-link mt-4 inline-block" to="/">
          Home
        </Link>
      </div>
    )
  }

  const manifest = state.data
  return (
    <SurrogateContent
      key={surrogateId}
      surrogateId={surrogateId}
      manifest={manifest}
    />
  )
}

function SurrogateContent({
  surrogateId,
  manifest,
}: {
  surrogateId: string
  manifest: Manifest
}) {
  const byKind = useMemo(
    () => groupFeaturesByKind(manifest),
    [manifest],
  )
  const models = useMemo(
    () => (manifest['tf-models'] as TfModel[] | undefined) ?? [],
    [manifest],
  )
  const selectionKeys = useMemo(() => allSelectionKeys(models), [models])
  const [activeTfIdx, setActiveTfIdx] = useState(0)
  const [tab, setTab] = useState<'explorer' | 'info'>('explorer')
  const [configError, setConfigError] = useState<string | null>(null)

  const tf = models[activeTfIdx] ?? models[0]

  const handleConfigChange = useCallback(
    (id: string, value: string) => {
      if (!tf) return
      const cur = getSelectionFromModel(tf, selectionKeys)
      const next = { ...cur, [id]: value }
      const idx = findTfIndexBySelection(models, next, selectionKeys)
      if (idx < 0) {
        setConfigError('No trained model is available for that configuration.')
        return
      }
      setConfigError(null)
      setActiveTfIdx(idx)
    },
    [tf, models, selectionKeys],
  )

  const title = manifest.name ?? manifest.id
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="dash-muted mb-6 text-sm" aria-label="Breadcrumb">
        <Link className="dash-link" to="/">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="dash-text">{title}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="dash-heading text-2xl font-semibold">{title}</h1>
          <span
            className="dash-chip rounded border px-1.5 py-0.5 font-mono text-xs"
            title="Surrogate id"
          >
            {surrogateId}
          </span>
        </div>
        <p className="dash-muted mt-1 text-sm">Surrogate model explorer</p>
      </header>

      <div
        className="dash-divider mb-4 flex border-b"
        role="tablist"
        aria-label="View"
      >
        <button
          type="button"
          role="tab"
          id="tab-explorer"
          aria-selected={tab === 'explorer'}
          className={
            tab === 'explorer'
              ? 'dash-tab-active -mb-px border-b-2 px-3 py-2 text-sm font-medium'
              : 'dash-tab px-3 py-2 text-sm'
          }
          onClick={() => setTab('explorer')}
        >
          Explorer
        </button>
        <button
          type="button"
          role="tab"
          id="tab-info"
          aria-selected={tab === 'info'}
          className={
            tab === 'info'
              ? 'dash-tab-active -mb-px border-b-2 px-3 py-2 text-sm font-medium'
              : 'dash-tab px-3 py-2 text-sm'
          }
          onClick={() => setTab('info')}
        >
          Model Info
        </button>
      </div>

      {tab === 'explorer' && (
        <div
          id="panel-explorer"
          role="tabpanel"
          aria-labelledby="tab-explorer"
        >
          {tf ? (
            <SurrogateExploration
              key={`${surrogateId}-${tf.path}`}
              surrogateId={surrogateId}
              manifest={manifest}
              activeTf={tf}
              onConfigChange={handleConfigChange}
              configError={configError}
            />
          ) : (
            <p className="dash-muted">No TensorFlow model in manifest.</p>
          )}
        </div>
      )}

      {tab === 'info' && (
        <div
          className="space-y-8"
          id="panel-info"
          role="tabpanel"
          aria-labelledby="tab-info"
        >
          {manifest.description && (
            <section>
              <h2 className="dash-heading mb-2 text-lg font-medium">Description</h2>
              <p className="dash-text max-w-3xl text-sm leading-relaxed">
                {manifest.description}
              </p>
            </section>
          )}

          <section>
            <h2 className="dash-heading mb-3 text-lg font-medium">File metadata</h2>
            <dl className="dash-muted grid gap-2 text-sm sm:grid-cols-2">
              {manifest['base-idf'] && (
                <div>
                  <dt className="dash-muted">Base IDF</dt>
                  <dd className="dash-text font-mono">
                    {manifest['base-idf']}
                  </dd>
                </div>
              )}
              {manifest['climate-file'] && (
                <div>
                  <dt className="dash-muted">Climate file</dt>
                  <dd className="dash-text font-mono">
                    {manifest['climate-file']}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {tf ? (
            <ModelStatusDevtools
              surrogateId={surrogateId}
              tf={tf}
            />
          ) : null}

          {SECTIONS.map(({ kind, title: sectionTitle }) => {
            const features = byKind.get(kind)
            if (!features?.length) return null
            return (
              <section key={kind}>
                <h2 className="dash-heading mb-3 text-lg font-medium">
                  {sectionTitle}
                </h2>
                <FeatureTable features={features} />
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * P2: full model URL + selection JSON in Model Info only (or collapsible in Explorer
 * as `ModelStatusBar` expand).
 */
function ModelStatusDevtools({
  surrogateId,
  tf,
}: {
  surrogateId: string
  tf: TfModel
}) {
  const modelUrl = tfModelJsonUrl(surrogateId, tf.path)
  return (
    <section className="dash-panel rounded-lg border p-3">
      <h3 className="dash-text text-sm font-medium">Model & selection</h3>
      <details className="mt-2 text-sm">
        <summary className="dash-tab cursor-pointer">
          TensorFlow model.json path
        </summary>
        <p className="dash-muted mt-2 break-all font-mono text-xs">{modelUrl}</p>
      </details>
      {tf.selection && (
        <p className="dash-muted mt-2 text-xs">
          <span className="dash-muted">Selection: </span>
          <code className="dash-text">{JSON.stringify(tf.selection)}</code>
        </p>
      )}
    </section>
  )
}

export default function SurrogatePage() {
  const { surrogateId } = useParams<{ surrogateId: string }>()

  if (!surrogateId) {
    return (
      <div className="dash-text p-8">
        Missing surrogate id. <Link className="dash-link" to="/">Home</Link>
      </div>
    )
  }

  return <SurrogateBody key={surrogateId} surrogateId={surrogateId} />
}
