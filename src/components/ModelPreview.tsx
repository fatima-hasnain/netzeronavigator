import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CatalogueModel } from '../lib/catalogue'
import { modelsBase } from '../lib/assetUrls'

interface RecoveryInput {
  position: number
  name: string
  candidateBounds?: { min: number; max: number }
  scalerEstimate: { mean: number; scale: number } | null
  estimateStatus: string
}
type RecoveryState = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; inputs: RecoveryInput[] }

function RecoveryInputs({ profilePath }: { profilePath: string }) {
  const [state, setState] = useState<RecoveryState>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    fetch(modelsBase() + profilePath, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error(`Metadata request failed (${response.status})`)
      const data = await response.json()
      if (!Array.isArray(data.tensorInputs)) throw Error('Invalid reconstruction metadata')
      if (!controller.signal.aborted) setState({ status: 'ready', inputs: data.tensorInputs })
    }).catch((error: unknown) => { if (!controller.signal.aborted) setState({ status: 'error', error: String(error) }) })
    return () => controller.abort()
  }, [profilePath])
  if (state.status === 'loading') return <p role="status" className="dash-muted">Loading reconstructed parameters...</p>
  if (state.status === 'error') return <p role="alert" className="dash-error">{state.error}</p>
  const format = (value: number) => value.toLocaleString('en-CA', { maximumSignificantDigits: 6 })
  return <section className="mt-6">
    <h2 className="dash-heading text-lg font-semibold">Reconstructed inputs</h2>
    <p className="dash-muted mt-2 text-sm">Candidate ranges and scaler estimates for inspection. These are not verified training statistics.</p>
    <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="dash-muted"><tr><th className="p-2">Position</th><th className="p-2">Parameter</th><th className="p-2">Candidate range</th><th className="p-2">Estimated mean / scale</th></tr></thead>
      <tbody>{state.inputs.map(input => <tr key={input.position} className="dash-divider border-t">
        <td className="dash-muted p-2">{input.position}</td><td className="dash-text p-2">{input.name}<p className="dash-muted mt-1 text-xs">{input.estimateStatus}</p></td>
        <td className="dash-text whitespace-nowrap p-2">{input.candidateBounds ? `${format(input.candidateBounds.min)} to ${format(input.candidateBounds.max)}` : 'Not confirmed'}</td>
        <td className="dash-text whitespace-nowrap p-2">{input.scalerEstimate ? `${format(input.scalerEstimate.mean)} / ${format(input.scalerEstimate.scale)}` : 'Unresolved'}</td>
      </tr>)}</tbody>
    </table></div>
  </section>
}

export function ModelPreview({ entry }: { entry: CatalogueModel }) {
  return <div className="mx-auto max-w-6xl px-4 py-10">
    <Link className="dash-link" to="/">Change model</Link>
    <h1 className="dash-heading mt-6 text-2xl font-semibold">{entry.displayName}</h1>
    <p className="dash-text mt-2">{entry.archetype} | {entry.location} | Version {entry.version}</p>
    <span className="dash-chip mt-3 inline-block rounded border px-2 py-1 text-xs">Experimental model details</span>
    <section className="dash-panel mt-6 rounded-lg border p-4">
      <h2 className="dash-heading font-semibold">Selected model - predictions not connected yet</h2>
      <p className="dash-text mt-2 text-sm">You can inspect this model now. Interactive predictions and charts will become available once its model export and preprocessing are ready.</p>
      <ul className="dash-warning mt-3 list-disc space-y-1 pl-5 text-sm">{entry.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
    </section>
    <section className="mt-6">
      <h2 className="dash-heading text-lg font-semibold">Model metadata</h2>
      <p className="dash-text mt-2 text-sm">{entry.inputCount ?? 'Unknown'} inputs | {entry.outputCount ?? 'Unknown'} outputs | {entry.format}</p>
      <p className="dash-muted mt-2 text-sm">Metadata status: {entry.validationStatus.replaceAll('-', ' ')}</p>
      <p className="dash-text mt-2 text-sm">Outputs: {entry.outputNames.length ? entry.outputNames.join(', ') : 'Names not recovered yet'}</p>
      {entry.recovery && <p className="dash-muted mt-2 text-sm">{entry.recovery.summary} {entry.recovery.outputOrderStatus}</p>}
      <details className="dash-muted mt-3 text-xs"><summary className="cursor-pointer">Source model path</summary><p className="mt-2 break-all font-mono">{entry.modelPath}</p></details>
    </section>
    {entry.recovery ? <RecoveryInputs key={entry.recovery.profilePath} profilePath={entry.recovery.profilePath} /> : <p className="dash-muted mt-6 text-sm">Parameter details have not been exported for this model yet.</p>}
  </div>
}
