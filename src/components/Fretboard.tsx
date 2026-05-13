import { useEffect, useMemo, useRef, useState } from 'react'
import { BASS_TUNING, GUITAR_TUNING, CHROMATIC_NOTES, getNoteAtFret, NOTE_TO_SOLFEGE } from '../data/notes'
import type { FretNote, LabelMode, NoteName, InstrumentType } from '../types'

interface FretboardProps {
  notes: FretNote[]
  labelMode: LabelMode
  totalFrets?: number
  instrument?: InstrumentType
  tuning?: NoteName[]
  isStandardTuning?: boolean
  onFretClick: (string: number, fret: number, note: NoteName) => void
  onStringTuningChange?: (stringIdx: number, newNote: NoteName) => void
  onResetTuning?: () => void
}

// Fret markers per real guitar/bass convention
const MARKER_FRETS    = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24])
const DOUBLE_MARKERS  = new Set([12, 24])

// String configs by instrument (thickness and colors only — labels come from tuning)
const INSTRUMENT_CONFIG: Record<InstrumentType, { thickness: number[]; colors: string[] }> = {
  bass: {
    thickness: [1, 2, 3, 4],
    colors: ['#b0b8c8', '#9099a8', '#707888', '#505868'],
  },
  guitar: {
    thickness: [1, 1.5, 2, 2.5, 3, 3.5],
    colors: ['#d0d8e8', '#c0c8d8', '#b0b8c8', '#9099a8', '#707888', '#505868'],
  },
  piano: {
    thickness: [],
    colors: [],
  },
}

/**
 * Returns chromatic notes starting from given note going DOWN (descending semitone).
 * E.g. for 'E' returns: ['E', 'D#', 'D', 'C#', 'C', 'B', 'A#', 'A', 'G#', 'G', 'F#', 'F']
 */
function getNotesDescending(startNote: NoteName): NoteName[] {
  const startIdx = CHROMATIC_NOTES.indexOf(startNote)
  const result: NoteName[] = []
  for (let i = 0; i < 12; i++) {
    const idx = ((startIdx - i) % 12 + 12) % 12
    result.push(CHROMATIC_NOTES[idx])
  }
  return result
}

// Base cell height — scaled by zoom at render time
const BASE_CELL_H = 72

// Base dot size — scaled by zoom at render time
const BASE_DOT_SIZE = 44

const ZOOM_MIN  = 0.5
const ZOOM_MAX  = 2.0
const ZOOM_STEP = 0.25

/**
 * Width of each fret column in pixels (base, before zoom).
 * Mirrors real bass fret spacing: each fret is 1/2^(1/12) narrower than the
 * one before it. Fret 1 = 90 px; clamped to 28 px minimum at the high end.
 *
 * Pass inline styles — Tailwind can't generate arbitrary widths at build time.
 * TODO: When guitar mode is added, accept scaleLength as a prop and rescale.
 */
function getFretWidth(fret: number): number {
  if (fret === 0) return 56  // open-string nut area
  return Math.max(28, Math.round(90 * Math.pow(2, -(fret - 1) / 12)))
}

function getLabel(note: FretNote, mode: LabelMode): string {
  switch (mode) {
    case 'note':     return note.note
    case 'solfege':  return NOTE_TO_SOLFEGE[note.note]
    case 'interval': return note.interval
    case 'degree':   return note.degree
    case 'finger':   return String(note.finger) // 0 = open string, 1-4 = fingers
  }
}

export default function Fretboard({
  notes,
  labelMode,
  totalFrets = 24,
  instrument = 'bass',
  tuning: propTuning,
  isStandardTuning = true,
  onFretClick,
  onStringTuningChange,
  onResetTuning,
}: FretboardProps) {
  const [zoom, setZoom] = useState(1.0)
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const cellH   = Math.round(BASE_CELL_H * zoom)
  const dotSize = Math.round(BASE_DOT_SIZE * zoom)
  const w       = (fret: number) => Math.round(getFretWidth(fret) * zoom)

  // Get configuration for the selected instrument
  const config = INSTRUMENT_CONFIG[instrument]
  const tuning = propTuning ?? (instrument === 'guitar' ? GUITAR_TUNING : BASS_TUNING)

  // Build labels array from current tuning (display order: top = highest string)
  // tuning[0] = lowest, tuning[length-1] = highest
  // display string 0 (top) corresponds to tuning[length-1] (highest)
  const labels = useMemo(() => {
    return Array.from({ length: tuning.length }, (_, displayIdx) => {
      const tuningIdx = (tuning.length - 1) - displayIdx
      return tuning[tuningIdx]
    })
  }, [tuning])

  // O(1) note lookup by "stringNum-fret"
  const noteMap = useMemo(() => {
    const map = new Map<string, FretNote>()
    notes.forEach(n => map.set(`${n.string}-${n.fret}`, n))
    return map
  }, [notes])

  // stringNum → tuning index
  function openNoteForString(stringNum: number): NoteName {
    const tuningIdx = (tuning.length - 1) - stringNum
    return tuning[tuningIdx]
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    if (openDropdown !== null) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [openDropdown])

  const fretColumns = Array.from({ length: totalFrets }, (_, i) => i + 1)
  const strings     = Array.from({ length: tuning.length }, (_, i) => i)

  return (
    <div className="select-none">

      {/* ── Top bar: zoom controls + tuning badge ─────────────────────────── */}
      <div className="flex items-center gap-2 mb-2 pr-1">

        <div className="flex-1" />

        {/* Zoom controls */}
        <button
          onClick={() => setZoom(z => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100))}
          disabled={zoom <= ZOOM_MIN}
          className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-800 text-gray-300
                     hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors text-base leading-none"
          title="Achicar"
        >
          −
        </button>

        <span className="text-xs text-gray-500 w-10 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => setZoom(z => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100))}
          disabled={zoom >= ZOOM_MAX}
          className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-800 text-gray-300
                     hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors text-base leading-none"
          title="Agrandar"
        >
          +
        </button>

        <button
          onClick={() => setZoom(1.0)}
          className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-800 text-gray-500
                     hover:bg-gray-700 hover:text-gray-300 transition-colors"
          title="Restablecer zoom"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Tuning status badge — top right */}
        {onStringTuningChange && (
          <div className="flex items-center gap-1.5 ml-2">
            {isStandardTuning ? (
              <span className="px-2.5 py-1 text-xs font-semibold rounded bg-teal-900/40 text-teal-300 border border-teal-700/40">
                Afinación estándar
              </span>
            ) : (
              <>
                <span className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-900/40 text-amber-300 border border-amber-700/40">
                  Afinación personalizada
                </span>
                {onResetTuning && (
                  <button
                    onClick={onResetTuning}
                    className="px-2 py-1 text-xs font-medium rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
                    title="Restablecer a afinación estándar"
                  >
                    Reset
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Fretboard ──────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto pb-3">
        <div className="inline-flex flex-col">

          {/* ── Fretboard body ───────────────────────────────────────────────── */}
          <div className="flex rounded-t overflow-hidden border border-amber-900/60">

            {/* String-name labels (with tuning dropdown) */}
            <div
              ref={dropdownRef}
              className="flex flex-col flex-shrink-0 bg-gray-900 border-r border-gray-700 relative"
              style={{ width: Math.round(44 * zoom), zIndex: 20 }}
            >
              {strings.map(s => {
                const currentNote = labels[s]
                const isOpen = openDropdown === s
                const descendingNotes = getNotesDescending(currentNote)

                return (
                  <div
                    key={s}
                    className="relative flex items-center justify-center"
                    style={{ height: cellH }}
                  >
                    <button
                      onClick={() => {
                        if (onStringTuningChange) {
                          setOpenDropdown(isOpen ? null : s)
                        }
                      }}
                      disabled={!onStringTuningChange}
                      className={`flex items-center gap-0.5 px-1.5 py-1 rounded font-bold transition-colors ${
                        onStringTuningChange
                          ? 'text-gray-200 hover:bg-gray-700 cursor-pointer'
                          : 'text-gray-400 cursor-default'
                      }`}
                      style={{ fontSize: Math.round(14 * zoom) }}
                      title={onStringTuningChange ? 'Cambiar afinación' : undefined}
                    >
                      <span>{currentNote}</span>
                      {onStringTuningChange && (
                        <svg className="w-2.5 h-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>

                    {/* Dropdown menu */}
                    {isOpen && onStringTuningChange && (
                      <div
                        className="absolute left-full ml-1 top-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
                        style={{ zIndex: 50, minWidth: 70, maxHeight: 320, overflowY: 'auto' }}
                      >
                        <div className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold px-2 pt-1.5 pb-0.5 sticky top-0 bg-gray-900">
                          Afinar a
                        </div>
                        {descendingNotes.map(note => (
                          <button
                            key={note}
                            onClick={() => {
                              onStringTuningChange(s, note)
                              setOpenDropdown(null)
                            }}
                            className={`w-full text-left px-3 py-1.5 text-sm font-semibold transition-colors ${
                              note === currentNote
                                ? 'bg-amber-900/40 text-amber-300'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                          >
                            {note}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Fret 0 — open strings; right border = NUT */}
            <div
              className="flex flex-col flex-shrink-0 bg-amber-950 border-r-4 border-gray-300"
              style={{ width: w(0) }}
            >
              {strings.map(s => {
                const noteData = noteMap.get(`${s}-0`)
                return (
                  <FretCell
                    key={s}
                    stringIdx={s}
                    noteData={noteData}
                    labelMode={labelMode}
                    thickness={config.thickness[s]}
                    color={config.colors[s]}
                    cellH={cellH}
                    dotSize={dotSize}
                    zoom={zoom}
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
                style={{ width: w(fret) }}
              >
                {strings.map(s => {
                  const noteData = noteMap.get(`${s}-${fret}`)
                  return (
                    <FretCell
                      key={s}
                      stringIdx={s}
                      noteData={noteData}
                      labelMode={labelMode}
                      thickness={config.thickness[s]}
                      color={config.colors[s]}
                      cellH={cellH}
                      dotSize={dotSize}
                      zoom={zoom}
                      onClick={() => onFretClick(s, fret, getNoteAtFret(openNoteForString(s), fret))}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* ── Fret markers + numbers ───────────────────────────────────────── */}
          <div className="flex bg-gray-900/80 rounded-b border-x border-b border-amber-900/30">
            {/* Spacer: string-name column */}
            <div className="flex-shrink-0" style={{ width: Math.round(44 * zoom) }} />
            {/* Spacer: fret-0 column */}
            <div className="flex-shrink-0" style={{ width: w(0) }} />

            {fretColumns.map(fret => (
              <div
                key={fret}
                className="flex-shrink-0 flex flex-col items-center pt-1 pb-1 gap-0.5"
                style={{ width: w(fret) }}
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
  cellH: number
  dotSize: number
  zoom: number
  onClick: () => void
}

function NoteDot({
  note,
  labelMode,
  dotSize,
  zoom,
}: {
  note: FretNote
  labelMode: LabelMode
  dotSize: number
  zoom: number
}) {
  const label    = getLabel(note, labelMode)
  const fontSize = Math.round((label.length <= 2 ? 14 : label.length === 3 ? 12 : 10) * zoom)
  return (
    <span
      className={`relative z-10 flex items-center justify-center rounded-full font-bold leading-none
        ${note.isRoot
          ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-900/60 ring-2 ring-amber-300/40'
          : 'bg-teal-500 text-gray-950 shadow-sm shadow-teal-900/40'
        }`}
      style={{ width: dotSize, height: dotSize, fontSize }}
    >
      {label}
    </span>
  )
}

function FretCell({
  stringIdx,
  noteData,
  labelMode,
  thickness,
  color,
  cellH,
  dotSize,
  zoom,
  onClick,
}: FretCellProps) {
  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer hover:bg-amber-800/20 transition-colors"
      style={{ height: cellH }}
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

      {/* Note dot */}
      {noteData && (
        <NoteDot note={noteData} labelMode={labelMode} dotSize={dotSize} zoom={zoom} />
      )}
    </div>
  )
}
