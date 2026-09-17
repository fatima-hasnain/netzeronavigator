/**
 * The NZN mark: a bold "N" monogram formed by two verticals and a rising
 * diagonal, doubling as a small performance trend line. Uses CSS vars so it
 * re-themes with `data-theme`, unlike the static favicon which needs literal
 * colours baked in.
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="var(--dash-surface-raised)" />
      <rect x="7" y="7" width="5.5" height="18" rx="1.5" fill="var(--dash-text-muted)" />
      <rect x="19.5" y="7" width="5.5" height="18" rx="1.5" fill="var(--dash-text-muted)" />
      <path d="M10.5 22 L21.5 10" stroke="var(--dash-accent)" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="21.5" cy="10" r="2.6" fill="var(--dash-accent)" />
    </svg>
  )
}
