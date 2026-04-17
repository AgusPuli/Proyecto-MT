import { useMemo } from 'react'
import { STANDARD_TUNING, getNoteAtFret, NOTE_TO_SOLFEGE } from '../data/notes'
import type { FretNote, LabelMode, NoteName } from '../types'

// TODO: Accept tuning as a prop when multi-tuning support lands.

interface FretboardProps {
  notes: FretNote[]
  labelMode: LabelMode
  totalFrets?: number
  onFretClick: (string: number, fret: number, note: NoteName) => void
}

// Fret markers per real bass guitar convention
const MARKER_FRETS    = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24])
const DOUBLE_MARKERS  = new Set([12, 24])

// String display order: 0 = G (top), 3 = E (bottom)
const STRING_LABELS = ['G', 'D', 'A', 'E']

// String line thickness (px): thinnest at top (G), thickest at bottom (E)
const STRING_THICKNESS = [1, 2, 3, 4]

// String line colours — slightly lighter for higher strings
const STRING_COLORS = ['#b0b8c8', '#9099a8', '#707888', '#505868']

// Cell height per string row (px)
const CELL_H = 52

/**
 * Width of each fret column in pixels.
 * Mirrors real bass fret spacing: each fret is 1/2^(1/12) narrower than the
 * one before it. Fret 1 = 70 px; clamped to 22 px minimum at the high end.
 *
 * Pass inline styles — Tailwind can't generate arbitrary widths at build time.
 * TODO: When guitar mode is added, accept scaleLength as a prop and rescale.
 */
function getFretWidth(fret: number): number {
  if (fret === 0) return 46  // open-string nut area
  return Math.max(22, Math.round(70 * Math.pow(2, -(fret - 1) / 12)))
}

function getLabel(note: FretNote, mode: LabelMode): string {
  switch (mode) {
    case 'note':     return note.note
    case 'solfege':  return NOTE_TO_SOLFEGE[note.note]
    case 'interval': return note.interval
    case 'degree':   return note.degree
    case 'finger':   return note.finger === 0 ? 'O' : String(note.finger)
  }
}

export default function Fretboard({
  notes,
  labelMode,
  totalFrets = 24,
  onFretClick,
}: FretboardProps) {
  // O(1) note lookup by "stringNum-fret"
  const noteMap = useMemo(() => {
    const map = new Map<string, FretNote>()
    notes.forEach(n => map.set(`${n.string}-${n.fret}`, n))
    return map
  }, [notes])

  // stringNum → STANDARD_TUNING index (string 0 = G = tuningIdx 3)
  function openNoteForString(stringNum: number): NoteName {
    const tuningIdx = (STANDARD_TUNING.length - 1) - stringNum
    return STANDARD_TUNING[tuningIdx]
  }

  const fretColumns = Array.from({ length: totalFrets }, (_, i) => i + 1)
  const strings     = [0, 1, 2, 3]

  return (
    <div className="overflow-x-auto pb-3 select-none">
      <div className="inline-flex flex-col">

        {/* ── Fretboard body ─────────────────────────────────────────────── */}
        <div className="flex rounded-t overflow-hidden border border-amber-900/60">

          {/* String-name labels */}
          <div
            className="flex flex-col flex-shrink-0 bg-gray-900 border-r border-gray-700 z-10"
            style={{ width: 36 }}
          >
            {strings.map(s => (
              <div
                key={s}
                className="flex items-center justify-center text-sm font-bold text-gray-400"
                style={{ height: CELL_H }}
              >
                {STRING_LABELS[s]}
              </div>
            ))}
          </div>

          {/* Fret 0 — open strings; right border = NUT */}
          <div
            className="flex flex-col flex-shrink-0 bg-amber-950 border-r-4 border-gray-300"
            style={{ width: getFretWidth(0) }}
          >
            {strings.map(s => {
              const noteData = noteMap.get(`${s}-0`)
              return (
                <FretCell
                  key={s}
                  stringIdx={s}
                  noteData={noteData}
                  labelMode={labelMode}
                  thickness={STRING_THICKNESS[s]}
                  color={STRING_COLORS[s]}
                  onClick={() => onFretClick(s, 0, getNoteAtFret(openNoteForString(s), 0))}
                />
              )
            })}
          </div>

          {/* Frets 1 – N */}
          {fretColumns.map(fret => (
            <div
              key={fret}
              className="flex flex-col flex-shrink-0 bg-amber-950 border-r border-gray-600/70"
              style={{ width: getFretWidth(fret) }}
            >
              {strings.map(s => {
                const noteData = noteMap.get(`${s}-${fret}`)
                return (
                  <FretCell
                    key={s}
                    stringIdx={s}
                    noteData={noteData}
                    labelMode={labelMode}
                    thickness={STRING_THICKNESS[s]}
                    color={STRING_COLORS[s]}
                    onClick={() => onFretClick(s, fret, getNoteAtFret(openNoteForString(s), fret))}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* ── Fret markers + numbers ─────────────────────────────────────── */}
        <div className="flex bg-gray-900/80 rounded-b border-x border-b border-amber-900/30">
          {/* Spacer: string-name column */}
          <div className="flex-shrink-0" style={{ width: 36 }} />
          {/* Spacer: fret-0 column */}
          <div className="flex-shrink-0" style={{ width: getFretWidth(0) }} />

          {fretColumns.map(fret => (
            <div
              key={fret}
              className="flex-shrink-0 flex flex-col items-center pt-1 pb-1 gap-0.5"
              style={{ width: getFretWidth(fret) }}
            >
              {/* Dot(s) */}
              <div className="flex items-center gap-0.5 h-3">
                {MARKER_FRETS.has(fret) && (
                  DOUBLE_MARKERS.has(fret) ? (
                    <>
                      <span className="block w-2 h-2 rounded-full bg-gray-500" />
                      <span className="block w-2 h-2 rounded-full bg-gray-500" />
                    </>
                  ) : (
                    <span className="block w-2 h-2 rounded-full bg-gray-500" />
                  )
                )}
              </div>
              {/* Fret number */}
              <span className="text-gray-600 leading-none" style={{ fontSize: 10 }}>
                {fret}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FretCell — a single string × fret intersection
// ---------------------------------------------------------------------------

interface FretCellProps {
  stringIdx: number
  noteData: FretNote | undefined
  labelMode: LabelMode
  thickness: number
  color: string
  onClick: () => void
}

// Fixed dot size for all label modes — font shrinks to fit longer labels (e.g. "Sol#")
const DOT_SIZE = 34
function NoteDot({ note, labelMode }: { note: FretNote; labelMode: LabelMode }) {
  const label    = getLabel(note, labelMode)
  const fontSize = label.length <= 2 ? 12 : label.length === 3 ? 10 : 9
  return (
    <span
      className={`relative z-10 flex items-center justify-center rounded-full font-bold leading-none
        ${note.isRoot
          ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-900/60 ring-2 ring-amber-300/40'
          : 'bg-teal-500 text-gray-950 shadow-sm shadow-teal-900/40'
        }`}
      style={{ width: DOT_SIZE, height: DOT_SIZE, fontSize }}
    >
      {label}
    </span>
  )
}

function FretCell({ stringIdx, noteData, labelMode, thickness, color, onClick }: FretCellProps) {
  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer hover:bg-amber-800/20 transition-colors"
      style={{ height: CELL_H }}
      data-string={stringIdx}
    >
      {/* String line */}
      <span
        className="absolute inset-x-0 pointer-events-none"
        style={{
          height: thickness,
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: color,
        }}
      />

      {/* Note dot — wider for longer labels (e.g. solfège "Sol#") */}
      {noteData && (
        <NoteDot note={noteData} labelMode={labelMode} />
      )}
    </div>
  )
}
