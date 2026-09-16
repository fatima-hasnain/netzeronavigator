import { useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useManifest } from '../hooks/useManifest'
import { ModelPreview } from '../components/ModelPreview'
import { useTfModel } from '../hooks/useTfModel'
import { tfModelJsonUrl } from '../lib/assetUrls'
import { tensorInputFeatures, tensorOutputFeatures } from '../lib/tfFeatureSelection'
import { initialTensorValueMap } from '../tf/initialTensorValues'
import { readChartHandoff, writeChartHandoff } from '../lib/chartHandoff'
import type { OutputSelection } from '../lib/outputSelection'
import { OutputSensitivityChart } from '../components/OutputSensitivityChart'
import { OutputHeatmapView } from '../components/OutputHeatmapView'
import { OutputTornadoView } from '../components/OutputTornadoView'
import { OutputSmallMultiplesView } from '../components/OutputSmallMultiplesView'
import type { EnergyDisplayUnit } from '../lib/volumeConversion'
import type { Manifest, TfModel } from '../types/manifest'

const ENERGY_MODES: readonly EnergyDisplayUnit[] = ['J', 'kWh', 'MWh']
const VIEW_LABELS: Record<string, string> = {
  sensitivity: 'Sensitivity',
  heatmap: 'Heatmap',
  tornado: 'Tornado',
  'all-inputs': 'All Inputs',
}

function parseEnergyMode(raw: string | null): EnergyDisplayUnit {
  return raw != null && (ENERGY_MODES as readonly string[]).includes(raw)
    ? (raw as EnergyDisplayUnit)
    : 'kWh'
}

function ChartBody({ surrogateId }: { surrogateId: string }) {
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

  if (state.status === 'preview') return <ModelPreview entry={state.entry} />
  return <ChartContent key={surrogateId} surrogateId={surrogateId} manifest={state.data} />
}

function ChartContent({
  surrogateId,
  manifest,
}: {
  surrogateId: string
  manifest: Manifest
}) {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const models = useMemo(
    () => (manifest['tf-models'] as TfModel[] | undefined) ?? [],
    [manifest],
  )
  const tfParam = params.get('tf')
  const tf: TfModel | undefined =
    tfParam ? models.find((m) => m.path === tfParam) : models[0]

  const orderedIn = useMemo(() => (tf ? tensorInputFeatures(tf) : []), [tf])
  const orderedOut = useMemo(() => (tf ? tensorOutputFeatures(tf) : []), [tf])
  const modelJsonUrl = useMemo(
    () => (tf ? tfModelJsonUrl(surrogateId, tf.path) : undefined),
    [surrogateId, tf],
  )
  const loadState = useTfModel(modelJsonUrl)

  const handoff = useMemo(() => readChartHandoff(), [])
  const valueMap = useMemo(
    () => handoff?.valueMap ?? initialTensorValueMap(orderedIn),
    [handoff, orderedIn],
  )

  const view = params.get('view') ?? 'sensitivity'
  const energyMode = parseEnergyMode(params.get('energy'))
  const initialOutputSelection = (params.get('output') as OutputSelection | null) ?? undefined
  const title = manifest.name ?? manifest.id
  const viewLabel = VIEW_LABELS[view] ?? view

  const openInSensitivity = useCallback(
    (inputId: string, outputSelection: OutputSelection) => {
      if (!tf) return
      writeChartHandoff({ valueMap })
      const nextParams = new URLSearchParams({
        tf: tf.path,
        view: 'sensitivity',
        energy: energyMode,
        input: inputId,
        output: outputSelection,
      })
      navigate(`/s/${surrogateId}/chart?${nextParams.toString()}`)
    },
    [energyMode, navigate, surrogateId, tf, valueMap],
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="dash-muted mb-4 text-sm" aria-label="Breadcrumb">
        <Link className="dash-link" to="/">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link className="dash-link" to={`/s/${surrogateId}`}>
          {title}
        </Link>
        <span className="mx-2">/</span>
        <span className="dash-text">{viewLabel} chart</span>
      </nav>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="dash-heading text-xl font-semibold">
          {viewLabel} — {title}
        </h1>
        <Link className="dash-link text-sm" to={`/s/${surrogateId}`}>
          Back to Explorer
        </Link>
      </header>

      {!tf ? (
        <p className="dash-muted">No TensorFlow model in manifest.</p>
      ) : loadState.status === 'error' ? (
        <p className="dash-error">Error loading model: {loadState.error}</p>
      ) : loadState.status !== 'ready' ? (
        <p className="dash-text">Loading model…</p>
      ) : (
        <div className="chart-fullpage">
          {view === 'heatmap' ? (
            <OutputHeatmapView
              surrogateId={surrogateId}
              model={loadState.model}
              tfModel={tf}
              inputFeatures={orderedIn}
              outputFeatures={orderedOut}
              valueMap={valueMap}
              energyMode={energyMode}
              initialXInputId={params.get('x') ?? undefined}
              initialYInputId={params.get('y') ?? undefined}
              initialOutputSelection={initialOutputSelection}
            />
          ) : view === 'tornado' ? (
            <OutputTornadoView
              surrogateId={surrogateId}
              model={loadState.model}
              tfModel={tf}
              inputFeatures={orderedIn}
              outputFeatures={orderedOut}
              valueMap={valueMap}
              energyMode={energyMode}
              initialOutputSelection={initialOutputSelection}
            />
          ) : view === 'all-inputs' ? (
            <OutputSmallMultiplesView
              surrogateId={surrogateId}
              model={loadState.model}
              tfModel={tf}
              inputFeatures={orderedIn}
              outputFeatures={orderedOut}
              valueMap={valueMap}
              energyMode={energyMode}
              initialOutputSelection={initialOutputSelection}
              onOpenInSensitivity={openInSensitivity}
            />
          ) : (
            <OutputSensitivityChart
              surrogateId={surrogateId}
              model={loadState.model}
              tfModel={tf}
              inputFeatures={orderedIn}
              outputFeatures={orderedOut}
              valueMap={valueMap}
              energyMode={energyMode}
              initialInputId={params.get('input') ?? undefined}
              initialOutputSelection={initialOutputSelection}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** Standalone full-page render of one visualization, opened via "Open in new tab". */
export default function ChartPage() {
  const { surrogateId } = useParams<{ surrogateId: string }>()

  if (!surrogateId) {
    return (
      <div className="dash-text p-8">
        Missing surrogate id. <Link className="dash-link" to="/">Home</Link>
      </div>
    )
  }

  return <ChartBody key={surrogateId} surrogateId={surrogateId} />
}
