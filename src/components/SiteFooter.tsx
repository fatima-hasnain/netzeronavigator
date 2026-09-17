const IBPSA_PAPER_URL = 'https://publications.ibpsa.org/proceedings/bs/2023/papers/bs2023_1394.pdf'
const REPO_URL = 'https://github.com/fatima-hasnain/netzeronavigator'

export function SiteFooter() {
  return (
    <footer className="dash-divider mt-16 border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm">
        <p className="dash-muted">
          Net Zero Navigator — surrogate models built with the MIT-licensed{' '}
          <a className="dash-link" href="https://gitlab.com/energyincities/NZN" target="_blank" rel="noreferrer">NZN</a> pipeline.
        </p>
        <div className="flex items-center gap-4">
          <a className="dash-link" href={IBPSA_PAPER_URL} target="_blank" rel="noreferrer">2023 IBPSA paper</a>
          <a className="dash-link" href={REPO_URL} target="_blank" rel="noreferrer">Repository</a>
        </div>
      </div>
    </footer>
  )
}
