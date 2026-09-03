import { Link } from 'react-router-dom'

/** Default fixture bundled under `public/models/`. */
export const DEFAULT_SURROGATE_ID = '20200224'

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="dash-heading text-3xl font-semibold tracking-tight">
        Net Zero Navigator
      </h1>
      <p className="dash-text mt-4">
        React skeleton: load surrogate manifests from static assets, inspect
        inputs and outputs, and swap in TensorFlow.js and charting later.
      </p>
      <p className="mt-8">
        <Link
          className="dash-btn rounded-md px-4 py-2 text-sm font-medium"
          to={`/s/${DEFAULT_SURROGATE_ID}`}
        >
          Open sample surrogate ({DEFAULT_SURROGATE_ID})
        </Link>
      </p>
      <p className="dash-muted mt-6 text-sm">
        Or visit{' '}
        <code className="dash-chip rounded px-1.5 py-0.5 font-mono">
          /s/&lt;surrogateId&gt;
        </code>{' '}
        with a folder present under{' '}
        <code className="dash-chip rounded px-1.5 py-0.5 font-mono">
          public/models/
        </code>
        .
      </p>
    </div>
  )
}
