import { CHROMATIC_NOTES } from '../data/notes'
import type { ChordVoicing } from '../data/chords'
import type { NoteName } from '../types'

interface ChordDiagramProps {
  voicing: ChordVoicing
  tuning: NoteName[]
  root: NoteName
  scale?: number          // size multiplier (default 1)
  showNoteNames?: boolean // print the sounding note under each string
}

const COL = 22 // horizontal gap between strings
const ROW = 26 // vertical gap between fret lines
const PAD_X = 16
const PAD_TOP = 24 // room for O / X markers
const DOT = 8

const C_LINE = '#64748b'   // string / fret lines (slate-500)
const C_NUT = '#cbd5e1'    // nut (slate-300)
const C_DOT = '#14b8a6'    // chord-tone dot (teal-500)
const C_ROOT = '#f59e0b'   // root dot (amber-500)
const C_DOTTXT = '#0f172a' // finger number inside dots
const C_MUTE = '#9ca3af'   // X / O markers (gray-400)

const pcOf = (n: NoteName) => CHROMATIC_NOTES.indexOf(n)

export default function ChordDiagram({
  voicing,
  tuning,
  root,
  scale = 1,
  showNoteNames = true,
}: ChordDiagramProps) {
  const n = tuning.length
  const { frets, fingers, barres, baseFret } = voicing

  const rows = Math.min(5, Math.max(4, voicing.maxFret - baseFret + 1))
  const showNut = baseFret === 1

  const col = COL * scale
  const row = ROW * scale
  const padX = PAD_X * scale
  const padTop = PAD_TOP * scale
  const dot = DOT * scale

  const gridW = (n - 1) * col
  const gridH = rows * row
  const gridTop = padTop
  const bottomPad = showNoteNames ? 18 * scale : 8 * scale
  const labelW = showNut ? 0 : 18 * scale // space for the "Nfr" label

  const svgW = gridW + padX * 2 + labelW
  const svgH = gridTop + gridH + bottomPad

  const x = (s: number) => padX + s * col
  const rootPc = pcOf(root)

  const noteOn = (s: number, f: number): NoteName =>
    CHROMATIC_NOTES[(pcOf(tuning[s]) + f) % 12]

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="select-none"
      style={{ overflow: 'visible' }}
    >
      {/* ── Fret (horizontal) lines ── */}
      {Array.from({ length: rows + 1 }, (_, r) => (
        <line
          key={`f${r}`}
          x1={x(0)} y1={gridTop + r * row}
          x2={x(n - 1)} y2={gridTop + r * row}
          stroke={C_LINE} strokeWidth={1 * scale}
        />
      ))}

      {/* ── Nut (thick) when in open position ── */}
      {showNut && (
        <line
          x1={x(0) - 0.5} y1={gridTop}
          x2={x(n - 1) + 0.5} y2={gridTop}
          stroke={C_NUT} strokeWidth={4 * scale} strokeLinecap="round"
        />
      )}

      {/* ── Position label (e.g. "5fr") when up the neck ── */}
      {!showNut && (
        <text
          x={x(n - 1) + 8 * scale}
          y={gridTop + row * 0.5}
          fontSize={10 * scale}
          fontWeight={700}
          fill={C_MUTE}
          dominantBaseline="middle"
        >
          {baseFret}fr
        </text>
      )}

      {/* ── String (vertical) lines ── */}
      {Array.from({ length: n }, (_, s) => (
        <line
          key={`s${s}`}
          x1={x(s)} y1={gridTop}
          x2={x(s)} y2={gridTop + gridH}
          stroke={C_LINE} strokeWidth={1 * scale}
        />
      ))}

      {/* ── Open / muted markers above the nut ── */}
      {frets.map((f, s) => {
        const cy = gridTop - 9 * scale
        if (f === null) {
          return (
            <text key={`m${s}`} x={x(s)} y={cy} fontSize={11 * scale}
              fontWeight={700} fill={C_MUTE} textAnchor="middle" dominantBaseline="middle">
              ✕
            </text>
          )
        }
        if (f === 0) {
          const isRoot = noteOn(s, 0) === root || pcOf(noteOn(s, 0)) === rootPc
          return (
            <circle key={`o${s}`} cx={x(s)} cy={cy} r={4 * scale}
              fill="none" stroke={isRoot ? C_ROOT : C_MUTE} strokeWidth={1.5 * scale} />
          )
        }
        return null
      })}

      {/* ── Barres ── */}
      {barres.map((bar, i) => {
        const r = bar.fret - baseFret + 1
        const cy = gridTop + (r - 0.5) * row
        const x1 = x(bar.fromString)
        const x2 = x(bar.toString)
        return (
          <rect
            key={`b${i}`}
            x={x1 - dot} y={cy - dot}
            width={x2 - x1 + dot * 2} height={dot * 2}
            rx={dot} ry={dot}
            fill={C_DOT} opacity={0.9}
          />
        )
      })}

      {/* ── Finger dots ── */}
      {frets.map((f, s) => {
        if (f === null || f === 0) return null
        const r = f - baseFret + 1
        const cy = gridTop + (r - 0.5) * row
        const isRoot = pcOf(noteOn(s, f)) === rootPc
        const finger = fingers[s]
        return (
          <g key={`d${s}`}>
            <circle cx={x(s)} cy={cy} r={dot} fill={isRoot ? C_ROOT : C_DOT}
              stroke="#0b1220" strokeWidth={0.5 * scale} />
            {finger != null && (
              <text x={x(s)} y={cy} fontSize={10 * scale} fontWeight={800}
                fill={C_DOTTXT} textAnchor="middle" dominantBaseline="central">
                {finger}
              </text>
            )}
          </g>
        )
      })}

      {/* ── Note names under each string ── */}
      {showNoteNames && frets.map((f, s) => {
        if (f === null) return null
        const note = noteOn(s, f)
        const isRoot = pcOf(note) === rootPc
        return (
          <text key={`n${s}`} x={x(s)} y={gridTop + gridH + 11 * scale}
            fontSize={8.5 * scale} fontWeight={isRoot ? 800 : 500}
            fill={isRoot ? C_ROOT : C_MUTE} textAnchor="middle" dominantBaseline="middle">
            {note}
          </text>
        )
      })}
    </svg>
  )
}
