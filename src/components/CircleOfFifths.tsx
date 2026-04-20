import { useState } from 'react'
import { BUILT_IN_SCALES } from '../data/scales'
import type { NoteName, Scale } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CircleOfFifthsProps {
  root: NoteName
  selectedScale: Scale
  onRootChange: (note: NoteName) => void
  onScaleChange: (scale: Scale) => void
  synchronized: boolean
  onSyncChange: (sync: boolean) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Circle data — 12 positions at 30° intervals, starting at 0° = Do M (12 hs)
// ─────────────────────────────────────────────────────────────────────────────

interface CircleEntry {
  angle: number        // degrees, 0° = top, clockwise
  major: string        // display name (Spanish)
  minor: string        // relative minor display name (Spanish)
  majorNote: NoteName  // English note name used by the app
  minorNote: NoteName  // English note name used by the app
  sharps: number
  flats: number
  notes: string[]      // 7 scale notes in Spanish for display
}

const CIRCLE: CircleEntry[] = [
  { angle: 0,   major: 'Do',   minor: 'La',    majorNote: 'C',  minorNote: 'A',
    sharps: 0, flats: 0,  notes: ['Do','Re','Mi','Fa','Sol','La','Si'] },
  { angle: 30,  major: 'Sol',  minor: 'Mi',    majorNote: 'G',  minorNote: 'E',
    sharps: 1, flats: 0,  notes: ['Sol','La','Si','Do','Re','Mi','Fa♯'] },
  { angle: 60,  major: 'Re',   minor: 'Si',    majorNote: 'D',  minorNote: 'B',
    sharps: 2, flats: 0,  notes: ['Re','Mi','Fa♯','Sol','La','Si','Do♯'] },
  { angle: 90,  major: 'La',   minor: 'Fa♯',   majorNote: 'A',  minorNote: 'F#',
    sharps: 3, flats: 0,  notes: ['La','Si','Do♯','Re','Mi','Fa♯','Sol♯'] },
  { angle: 120, major: 'Mi',   minor: 'Do♯',   majorNote: 'E',  minorNote: 'C#',
    sharps: 4, flats: 0,  notes: ['Mi','Fa♯','Sol♯','La','Si','Do♯','Re♯'] },
  { angle: 150, major: 'Si',   minor: 'Sol♯',  majorNote: 'B',  minorNote: 'G#',
    sharps: 5, flats: 0,  notes: ['Si','Do♯','Re♯','Mi','Fa♯','Sol♯','La♯'] },
  { angle: 180, major: 'Fa♯',  minor: 'Re♯',   majorNote: 'F#', minorNote: 'D#',
    sharps: 6, flats: 6,  notes: ['Fa♯','Sol♯','La♯','Si','Do♯','Re♯','Mi♯'] },
  { angle: 210, major: 'Re♭',  minor: 'Si♭',   majorNote: 'C#', minorNote: 'A#',
    sharps: 0, flats: 5,  notes: ['Re♭','Mi♭','Fa','Sol♭','La♭','Si♭','Do'] },
  { angle: 240, major: 'La♭',  minor: 'Fa',    majorNote: 'G#', minorNote: 'F',
    sharps: 0, flats: 4,  notes: ['La♭','Si♭','Do','Re♭','Mi♭','Fa','Sol'] },
  { angle: 270, major: 'Mi♭',  minor: 'Do',    majorNote: 'D#', minorNote: 'C',
    sharps: 0, flats: 3,  notes: ['Mi♭','Fa','Sol','La♭','Si♭','Do','Re'] },
  { angle: 300, major: 'Si♭',  minor: 'Sol',   majorNote: 'A#', minorNote: 'G',
    sharps: 0, flats: 2,  notes: ['Si♭','Do','Re','Mi♭','Fa','Sol','La'] },
  { angle: 330, major: 'Fa',   minor: 'Re',    majorNote: 'F',  minorNote: 'D',
    sharps: 0, flats: 1,  notes: ['Fa','Sol','La','Si♭','Do','Re','Mi'] },
]

// English note → circle index
const NOTE_TO_INDEX: Record<NoteName, number> = {
  'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5,
  'F#': 6, 'C#': 7, 'G#': 8, 'D#': 9, 'A#': 10, 'F': 11,
}

// Diatonic chord qualities for a major scale
const CHORD_QUALITIES = ['M', 'm', 'm', 'M', 'M', 'm', '°'] as const
const ROMAN_NUMERALS  = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] as const

// ─────────────────────────────────────────────────────────────────────────────
// SVG geometry helpers
// ─────────────────────────────────────────────────────────────────────────────

const CX = 250
const CY = 250

// Layer radii
const R_LABEL_MAJOR = 218   // major key text
const R_LABEL_MINOR = 180   // minor key text
const R_ARC_OUTER   = 162   // outer edge of clickable arc
const R_ARC_INNER   = 124   // inner edge of clickable arc
const R_ACC         = 100   // accidentals indicator ring center
const R_CENTER      = 78    // center circle

const GAP = 2.2  // degrees cut from each side of the sector

/** Convert polar coords (angle 0=top, clockwise) to SVG [x,y] */
function polar(r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

/** SVG path for a donut sector */
function sector(rOuter: number, rInner: number, angleDeg: number): string {
  const a0 = angleDeg - 15 + GAP
  const a1 = angleDeg + 15 - GAP
  const [x0o, y0o] = polar(rOuter, a0)
  const [x1o, y1o] = polar(rOuter, a1)
  const [x0i, y0i] = polar(rInner, a0)
  const [x1i, y1i] = polar(rInner, a1)
  return [
    `M ${x0o} ${y0o}`,
    `A ${rOuter} ${rOuter} 0 0 1 ${x1o} ${y1o}`,
    `L ${x1i} ${y1i}`,
    `A ${rInner} ${rInner} 0 0 0 ${x0i} ${y0i}`,
    'Z',
  ].join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CircleOfFifths({
  root,
  selectedScale,
  onRootChange,
  onScaleChange,
  synchronized,
  onSyncChange,
}: CircleOfFifthsProps) {
  const [hovered,  setHovered]  = useState<number | null>(null)
  // Local index used only when NOT synchronized
  const [localIdx, setLocalIdx] = useState<number>(NOTE_TO_INDEX[root] ?? 0)

  const majorScale = BUILT_IN_SCALES.find(s => s.id === 'major')!

  // When sync is ON  → follow the app root
  // When sync is OFF → use the circle's own independent selection
  const selectedIdx = synchronized ? (NOTE_TO_INDEX[root] ?? 0) : localIdx
  const entry       = CIRCLE[selectedIdx]

  function handleClick(idx: number) {
    if (synchronized) {
      // Sync ON: circle drives the app root + scale
      onRootChange(CIRCLE[idx].majorNote)
      onScaleChange(majorScale)
    } else {
      // Sync OFF: circle is independent, only updates itself
      setLocalIdx(idx)
    }
  }

  function accLabel(e: CircleEntry): string {
    if (e.sharps > 0 && e.flats > 0) return `${e.sharps}# / ${e.flats}b`
    if (e.sharps > 0) return `${e.sharps}#`
    if (e.flats  > 0) return `${e.flats}b`
    return '○'
  }

  function armaduraText(e: CircleEntry): string {
    if (e.sharps === 0 && e.flats === 0) return 'Sin alteraciones'
    if (e.sharps > 0 && e.flats > 0)
      return `${e.sharps} sostenido${e.sharps > 1 ? 's' : ''} / ${e.flats} bemol${e.flats > 1 ? 'es' : ''}`
    if (e.sharps > 0)
      return `${e.sharps} sostenido${e.sharps > 1 ? 's' : ''}`
    return `${e.flats} bemol${e.flats > 1 ? 'es' : ''}`
  }

  return (
    <div className="flex flex-wrap gap-6 items-start p-4 bg-gray-900 rounded-xl border border-gray-800">

      {/* ── SVG Circle ────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3">
        <svg
          viewBox="0 0 500 500"
          width="460"
          height="460"
          className="select-none overflow-visible"
        >
          {/* ── Background disc ── */}
          <circle cx={CX} cy={CY} r="235" fill="#0f172a" />

          {/* ── 12 Sectors ── */}
          {CIRCLE.map((e, i) => {
            const isSel     = i === selectedIdx
            const isNeighL  = i === (selectedIdx + 11) % 12
            const isNeighR  = i === (selectedIdx +  1) % 12
            const isOpp     = i === (selectedIdx +  6) % 12
            const isHov     = i === hovered

            // Sector fill
            let fill = '#1e293b'
            if (isSel)                 fill = '#92400e'   // amber: selected
            else if (isNeighL || isNeighR) fill = '#0d3d38' // teal-dark: neighbors
            else if (isOpp)            fill = '#3b1515'   // red-dark: opposite
            else if (isHov)            fill = '#334155'   // hover

            const majorTextColor = isSel ? '#fbbf24' : '#e2e8f0'
            const minorTextColor = isSel ? '#fcd34d' : '#cbd5e1'
            const accColor       = isSel ? '#fbbf24' : '#475569'

            const [lmx, lmy] = polar(R_LABEL_MAJOR, e.angle)
            const [lnx, lny] = polar(R_LABEL_MINOR, e.angle)
            const [lax, lay] = polar(R_ACC, e.angle)

            return (
              <g
                key={i}
                style={{ cursor: 'pointer' }}
                onClick={() => handleClick(i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Arc sector */}
                <path
                  d={sector(R_ARC_OUTER, R_ARC_INNER, e.angle)}
                  fill={fill}
                  stroke="#0f172a"
                  strokeWidth={1.5}
                  style={{ transition: 'fill 0.15s ease' }}
                />

                {/* Major label */}
                <text
                  x={lmx} y={lmy}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={majorTextColor}
                  fontSize={isSel ? 14 : 12}
                  fontWeight={isSel ? '800' : '600'}
                  style={{ userSelect: 'none', transition: 'fill 0.15s' }}
                >
                  {e.major} M
                </text>

                {/* Minor label */}
                <text
                  x={lnx} y={lny}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={minorTextColor}
                  fontSize={isSel ? 11 : 10}
                  fontWeight={isSel ? '700' : '400'}
                  style={{ userSelect: 'none', transition: 'fill 0.15s' }}
                >
                  {e.minor} m
                </text>

                {/* Accidentals */}
                <text
                  x={lax} y={lay}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={accColor}
                  fontSize={10}
                  fontWeight="600"
                  style={{ userSelect: 'none' }}
                >
                  {accLabel(e)}
                </text>
              </g>
            )
          })}

          {/* ── Dividing lines (radial, subtle) ── */}
          {CIRCLE.map((e, i) => {
            const [x1, y1] = polar(R_ARC_INNER - 2, e.angle + 15)
            const [x2, y2] = polar(R_ARC_INNER - 20, e.angle + 15)
            return (
              <line key={`line-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#0f172a" strokeWidth={1}
              />
            )
          })}

          {/* ── Center circle ── */}
          <circle cx={CX} cy={CY} r={R_CENTER}
            fill="#030712" stroke="#1e293b" strokeWidth={2} />

          <text x={CX} y={CY - 16}
            textAnchor="middle" fill="#fbbf24"
            fontSize={22} fontWeight="800" style={{ userSelect: 'none' }}>
            {entry.major} M
          </text>
          <text x={CX} y={CY + 6}
            textAnchor="middle" fill="#64748b"
            fontSize={12} style={{ userSelect: 'none' }}>
            rel. {entry.minor} m
          </text>
          <text x={CX} y={CY + 24}
            textAnchor="middle" fill="#475569"
            fontSize={11} style={{ userSelect: 'none' }}>
            {armaduraText(entry)}
          </text>
        </svg>

        {/* Sync toggle */}
        <button
          onClick={() => onSyncChange(!synchronized)}
          className={`text-xs px-4 py-1.5 rounded-full font-semibold transition-colors
            ${synchronized
              ? 'bg-teal-700/80 text-teal-100 hover:bg-teal-700'
              : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
            }`}
        >
          {synchronized ? '⟳ Sincronizado con escala' : '⟳ Sincronizar con escala'}
        </button>
      </div>

      {/* ── Info panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-[200px] space-y-5 py-1">

        {/* Key title */}
        <div>
          <h3 className="text-lg font-black text-amber-400">
            {entry.major} Mayor
          </h3>
          <p className="text-sm text-gray-500">
            Relativa menor: <span className="text-gray-400 font-semibold">{entry.minor} menor</span>
          </p>
          <p className="text-xs text-gray-600 mt-0.5">{armaduraText(entry)}</p>
        </div>

        {/* Scale notes */}
        <div>
          <p className="text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-2">
            Notas de la escala
          </p>
          <div className="flex flex-wrap gap-1.5">
            {entry.notes.map((note, i) => (
              <span
                key={i}
                className={`px-2.5 py-1 rounded-md text-xs font-bold
                  ${i === 0
                    ? 'bg-amber-900/50 text-amber-400 border border-amber-700/50'
                    : 'bg-gray-800 text-gray-300 border border-gray-700/40'
                  }`}
              >
                {note}
              </span>
            ))}
          </div>
        </div>

        {/* Diatonic chords */}
        <div>
          <p className="text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-2">
            Acordes diatónicos
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {entry.notes.map((note, i) => {
              const q = CHORD_QUALITIES[i]
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-600 font-mono text-[11px] w-9 shrink-0">
                    {ROMAN_NUMERALS[i]}
                  </span>
                  <span className={`text-sm font-semibold
                    ${q === 'M' ? 'text-teal-400'
                    : q === 'm' ? 'text-blue-400'
                    :             'text-red-400'}`}
                  >
                    {note} {q}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Neighboring keys */}
        <div>
          <p className="text-[11px] text-gray-600 uppercase tracking-wider font-semibold mb-2">
            Tonalidades vecinas
          </p>
          <div className="flex gap-2 text-xs">
            <div className="bg-teal-900/30 border border-teal-800/40 rounded-lg px-3 py-1.5 text-center">
              <p className="text-gray-500 text-[10px] mb-0.5">← 1b</p>
              <p className="text-teal-300 font-bold">
                {CIRCLE[(selectedIdx + 11) % 12].major} M
              </p>
            </div>
            <div className="bg-teal-900/30 border border-teal-800/40 rounded-lg px-3 py-1.5 text-center">
              <p className="text-gray-500 text-[10px] mb-0.5">1# →</p>
              <p className="text-teal-300 font-bold">
                {CIRCLE[(selectedIdx + 1) % 12].major} M
              </p>
            </div>
            <div className="bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-1.5 text-center">
              <p className="text-gray-500 text-[10px] mb-0.5">opuesta</p>
              <p className="text-red-400 font-bold">
                {CIRCLE[(selectedIdx + 6) % 12].major} M
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
