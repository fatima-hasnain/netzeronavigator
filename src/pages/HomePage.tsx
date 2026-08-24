import { Link } from 'react-router-dom'

/** Default fixture bundled under `public/models/`. */
export const DEFAULT_SURROGATE_ID = '20200224'

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
        Net Zero Navigator
      </h1>
      <p className="mt-4 text-zinc-400">
        React skeleton: load surrogate manifests from static assets, inspect
        inputs and outputs, and swap in TensorFlow.js and charting later.
      </p>
      <p className="mt-8">
        <Link
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
          to={`/s/${DEFAULT_SURROGATE_ID}`}
        >
          Open sample surrogate ({DEFAULT_SURROGATE_ID})
        </Link>
      </p>
      <p className="mt-6 text-sm text-zinc-500">
        Or visit{' '}
        <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-300">
          /s/&lt;surrogateId&gt;
        </code>{' '}
        with a folder present under{' '}
        <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-300">
          public/models/
        </code>
        .
      </p>
    </div>
  )
}
