// ─────────────────────────────────────────────────────────────────────────────
// ChordWheel — generic radial selector wheel (SVG).
// Extracted from ChordExplorer so it can be reused (e.g. song chord picker).
// ─────────────────────────────────────────────────────────────────────────────

const CX = 200, CY = 200
const R_OUTER = 192
const R_INNER = 116
const R_LABEL = (R_OUTER + R_INNER) / 2
const R_CENTER = 104

function polar(r: number, deg: number): [number, number] {
  const rad = (deg - 90) * (Math.PI / 180)
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

function sectorPath(rO: number, rI: number, center: number, half: number): string {
  const a0 = center - half, a1 = center + half
  const [x0o, y0o] = polar(rO, a0), [x1o, y1o] = polar(rO, a1)
  const [x0i, y0i] = polar(rI, a0), [x1i, y1i] = polar(rI, a1)
  return [
    `M ${x0o} ${y0o}`, `A ${rO} ${rO} 0 0 1 ${x1o} ${y1o}`,
    `L ${x1i} ${y1i}`, `A ${rI} ${rI} 0 0 0 ${x0i} ${y0i}`, 'Z',
  ].join(' ')
}

export interface WheelItem {
  id: string
  label: string
  fill: string      // base sector fill
  text: string      // label color
  highlight: boolean
}

export default function Wheel({
  items,
  onSelect,
  onHover,
  centerTop,
  centerBottom,
  centerColor,
}: {
  items: WheelItem[]
  onSelect: (i: number) => void
  onHover: (i: number | null) => void
  centerTop: string
  centerBottom: string
  centerColor: string
}) {
  const count = items.length
  const seg = 360 / count
  const gap = count > 12 ? 1.4 : 2.4
  const half = seg / 2 - gap

  return (
    <svg viewBox="0 0 400 400" width="100%" height="100%"
      className="select-none overflow-visible max-w-[380px] max-h-[380px]"
      style={{ filter: 'drop-shadow(0 6px 22px rgba(0,0,0,0.55))' }}>

      <defs>
        <radialGradient id="wheel-center" cx="35%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0b1220" />
        </radialGradient>
      </defs>

      {/* Background disc */}
      <circle cx={CX} cy={CY} r={R_OUTER + 6} fill="#0b1220" />
      <circle cx={CX} cy={CY} r={R_OUTER + 6} fill="none" stroke="#1e293b" strokeWidth={1.5} />

      {items.map((it, i) => {
        const center = i * seg
        const [lx, ly] = polar(R_LABEL, center)
        return (
          <g key={it.id} style={{ cursor: 'pointer' }}
            onClick={() => onSelect(i)}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}>
            <path
              d={sectorPath(R_OUTER, R_INNER, center, half)}
              fill={it.fill}
              fillOpacity={it.highlight ? 1 : 0.82}
              stroke="#0b1220" strokeWidth={1.5}
              style={{ transition: 'fill-opacity 0.15s ease' }}
            />
            {it.highlight && (
              <path
                d={sectorPath(R_OUTER, R_INNER, center, half)}
                fill="none" stroke="#fef3c7" strokeWidth={2} opacity={0.9}
              />
            )}
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
              fontSize={count > 12 ? 13 : 15} fontWeight={800}
              fill={it.text} style={{ pointerEvents: 'none', letterSpacing: '0.01em' }}>
              {it.label}
            </text>
          </g>
        )
      })}

      {/* Center */}
      <circle cx={CX} cy={CY} r={R_CENTER} fill="url(#wheel-center)" stroke="#334155" strokeWidth={1.5} />
      <text x={CX} y={CY - 10} textAnchor="middle" dominantBaseline="middle"
        fontSize={centerTop.length > 4 ? 30 : 40} fontWeight={900} fill={centerColor}
        style={{ pointerEvents: 'none', letterSpacing: '0.02em' }}>
        {centerTop}
      </text>
      <text x={CX} y={CY + 26} textAnchor="middle" dominantBaseline="middle"
        fontSize={12} fontWeight={600} fill="#94a3b8"
        style={{ pointerEvents: 'none' }}>
        {centerBottom}
      </text>
    </svg>
  )
}
