/**
 * Schematic of the surrogate idea for the hero section: design inputs go into
 * a trained neural network, which comes out the other side as predicted
 * performance — no EnergyPlus run in between. Purely decorative (aria-hidden),
 * the same idea is spelled out in words right beside it.
 */
export function SurrogateDiagram({ className }: { className?: string }) {
  const nodeX = [190, 222, 254]
  const layers = [
    [70, 100, 130],
    [55, 90, 125, 160],
    [70, 100, 130],
  ]
  return (
    <svg viewBox="0 0 400 190" fill="none" aria-hidden="true" className={className}>
      {/* Design inputs */}
      <rect x="8" y="55" width="120" height="80" rx="10" className="dash-card" style={{ fill: 'var(--dash-surface)', stroke: 'var(--dash-border)' }} />
      {[70, 90, 110].map((y, i) => (
        <g key={y}>
          <line x1="24" y1={y} x2="116" y2={y} stroke="var(--dash-border)" strokeWidth="2" strokeLinecap="round" />
          <circle cx={[52, 88, 68][i]} cy={y} r="4.5" fill="var(--dash-accent)" />
        </g>
      ))}
      <text x="68" y="152" textAnchor="middle" className="dash-muted" style={{ fill: 'var(--dash-text-muted)', font: '11px sans-serif' }}>Design inputs</text>

      <path d="M132 95 H164" stroke="var(--dash-border)" strokeWidth="2" markerEnd="url(#nzn-arrow)" />

      {/* Neural network */}
      <rect x="168" y="20" width="104" height="150" rx="10" style={{ fill: 'var(--dash-surface)', stroke: 'var(--dash-border)' }} />
      {layers.map((ys, li) =>
        ys.map((y, ni) =>
          li < layers.length - 1
            ? layers[li + 1].map((ny, nj) => (
                <line
                  key={`${li}-${ni}-${nj}`}
                  x1={nodeX[li]}
                  y1={y}
                  x2={nodeX[li + 1]}
                  y2={ny}
                  stroke="var(--dash-border)"
                  strokeWidth="1"
                  opacity="0.7"
                />
              ))
            : null,
        ),
      )}
      {layers.map((ys, li) =>
        ys.map((y, ni) => (
          <circle key={`${li}-${ni}`} cx={nodeX[li]} cy={y} r="5.5" fill={li === 1 ? 'var(--dash-accent)' : 'var(--dash-text-muted)'} />
        )),
      )}
      <text x="220" y="187" textAnchor="middle" style={{ fill: 'var(--dash-text-muted)', font: '11px sans-serif' }}>Trained neural network</text>

      <path d="M276 95 H308" stroke="var(--dash-border)" strokeWidth="2" markerEnd="url(#nzn-arrow)" />

      {/* Predicted performance */}
      <rect x="312" y="55" width="80" height="80" rx="10" style={{ fill: 'var(--dash-surface)', stroke: 'var(--dash-border)' }} />
      {[
        { x: 330, h: 30 },
        { x: 348, h: 45 },
        { x: 366, h: 20 },
      ].map(bar => (
        <rect key={bar.x} x={bar.x} y={115 - bar.h} width="10" height={bar.h} rx="2" fill="var(--dash-accent)" />
      ))}
      <text x="352" y="152" textAnchor="middle" style={{ fill: 'var(--dash-text-muted)', font: '11px sans-serif' }}>Predicted performance</text>

      <defs>
        <marker id="nzn-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="var(--dash-border)" />
        </marker>
      </defs>
    </svg>
  )
}
