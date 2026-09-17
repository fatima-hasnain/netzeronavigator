import { Link } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { HeaderModelPicker } from './HeaderModelPicker'

/** Persistent across every route so the explorer and chart pages keep the same
 * wayfinding back to the landing page's sections as the home page itself. */
export function SiteHeader() {
  return (
    <header className="dash-panel sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark size={30} />
          <span className="dash-heading text-base font-semibold tracking-tight">Net Zero Navigator</span>
        </Link>
        <nav aria-label="Site" className="flex items-center gap-4 text-sm">
          <HeaderModelPicker />
          <Link className="dash-link" to="/#about">About</Link>
        </nav>
      </div>
    </header>
  )
}
