import { useMemo, useState } from 'react'
import { NOTE_TO_SOLFEGE } from '../data/notes'
import type { FretNote, LabelMode, NoteName } from '../types'

interface PianoProps {
  notes: FretNote[]
  labelMode: LabelMode
  onNoteClick: (note: NoteName) => void
}

// ─── Dimensions ───────────────────────────────────────────────────────────────
const W_W  = 40    // white key width
const W_H  = 160   // white key height
const B_W  = 24    // black key width
const B_H  = 100   // black key height
const GAP  = 2     // gap between white keys
const STEP = W_W + GAP   // one white-key stride

// ─── Piano range: C2 → C7 (36 white keys, 5 octaves) ─────────────────────────
const OCTAVE_START = 2
const OCTAVE_END   = 7

const ALL_NOTES: NoteName[] = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const IS_WHITE   = new Set<NoteName>(['C','D','E','F','G','A','B'])

// White index within octave (C=0 … B=6)
const WHITE_IDX: Record<string, number> = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 }

// Gap index for black keys: "after the Nth white key of the octave"
// C#→gap1, D#→gap2, F#→gap4, G#→gap5, A#→gap6
const BLACK_GAP: Record<string, number> = { 'C#':1, 'D#':2, 'F#':4, 'G#':5, 'A#':6 }

interface KeyInfo {
  note: NoteName
  octave: number
  isWhite: boolean
  // position of left edge in px from piano left
  x: number
}

function buildKeys(): KeyInfo[] {
  const keys: KeyInfo[] = []
  let wCount = 0

  for (let oct = OCTAVE_START; oct <= OCTAVE_END; oct++) {
    const noteCount = oct === OCTAVE_END ? 1 : 12
    for (let i = 0; i < noteCount; i++) {
      const note = ALL_NOTES[i]
      const isWhite = IS_WHITE.has(note)
      const octaveBase = (oct - OCTAVE_START) * 7  // white keys before this octave

      let x: number
      if (isWhite) {
        x = (octaveBase + WHITE_IDX[note]) * STEP
        wCount++
      } else {
        // center the black key in the gap between its two white neighbours
        x = (octaveBase + BLACK_GAP[note]) * STEP - B_W / 2
      }

      keys.push({ note, octave: oct, isWhite, x })
    }
  }
  return keys
}

const ALL_KEYS = buildKeys()
const WHITE_KEYS = ALL_KEYS.filter(k => k.isWhite)
const BLACK_KEYS = ALL_KEYS.filter(k => !k.isWhite)
const TOTAL_W = WHITE_KEYS.length * STEP - GAP  // total piano width

// ─── Visual helpers ───────────────────────────────────────────────────────────

// Root = electric blue. Scale white = golden amber. Scale black = teal. Plain = white/dark.
function whiteKeyGradient(inScale: boolean, isRoot: boolean, hov: boolean): string {
  if (isRoot)  return 'linear-gradient(170deg, #93c5fd 0%, #3b82f6 55%, #1d4ed8 100%)'
  if (inScale) return 'linear-gradient(170deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)'
  if (hov)     return 'linear-gradient(170deg, #f3f4f6 0%, #e5e7eb 100%)'
  return         'linear-gradient(170deg, #f9fafb 0%, #ffffff 20%, #e5e7eb 85%, #d1d5db 100%)'
}

function blackKeyGradient(inScale: boolean, isRoot: boolean, hov: boolean): string {
  if (isRoot)  return 'linear-gradient(170deg, #60a5fa 0%, #2563eb 50%, #1e3a8a 100%)'
  if (inScale) return 'linear-gradient(170deg, #2dd4bf 0%, #14b8a6 40%, #0d9488 70%, #115e59 100%)'
  if (hov)     return 'linear-gradient(170deg, #6b7280 0%, #4b5563 40%, #374151 100%)'
  return         'linear-gradient(170deg, #52525b 0%, #3f3f46 20%, #27272a 55%, #18181b 80%, #09090b 100%)'
}

function whiteKeyBorder(inScale: boolean, isRoot: boolean): string {
  if (isRoot)  return '#1d4ed8'
  if (inScale) return '#d97706'
  return '#9ca3af'
}

function blackKeyShadow(inScale: boolean, isRoot: boolean): string {
  const base = '2px 6px 14px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)'
  if (isRoot)  return `${base}, 0 0 18px rgba(59,130,246,0.7)`
  if (inScale) return `${base}, 0 0 10px rgba(20,184,166,0.35)`
  return base
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Piano({ notes, labelMode, onNoteClick }: PianoProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  // note → FretNote (keep first occurrence per note name)
  const noteData = useMemo(() => {
    const m = new Map<NoteName, FretNote>()
    notes.forEach(n => { if (!m.has(n.note)) m.set(n.note, n) })
    return m
  }, [notes])

  function label(note: NoteName, fd?: FretNote): string {
    if (!fd) {
      // note not in scale — only note/solfege make sense
      return labelMode === 'solfege' ? NOTE_TO_SOLFEGE[note] : note
    }
    switch (labelMode) {
      case 'solfege':  return NOTE_TO_SOLFEGE[note]
      case 'interval': return fd.interval   // e.g. "b3", "5", "b7"
      case 'degree':   return fd.degree     // e.g. "I", "III", "V"
      case 'finger':   return note          // fingers don't apply to piano
      default:         return note
    }
  }

  return (
    <div className="select-none flex flex-col gap-3">

      {/* ── Piano body ──────────────────────────────────────────────────────── */}
      <div className="bg-gray-950 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
        {/* Header bar */}
        <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
          <span className="text-sm">🎹</span>
          <span className="text-xs text-gray-400 font-semibold tracking-widest uppercase">Piano</span>
          <span className="ml-auto text-[10px] text-gray-600">C2 – C7 · Click para cambiar raíz</span>
        </div>

        {/* Scrollable keys area */}
        <div className="overflow-x-auto" style={{ background: '#09090b' }}>
          {/* Top shadow rail */}
          <div style={{
            width: TOTAL_W,
            height: 10,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
          }} />

          {/* Keys container */}
          <div style={{ position: 'relative', width: TOTAL_W, height: W_H }}>

            {/* ── White keys ── */}
            {WHITE_KEYS.map(k => {
              const fd = noteData.get(k.note)
              const inScale = !!fd
              const isRoot  = fd?.isRoot ?? false
              const id = `${k.note}${k.octave}`
              const hov = hovered === id

              return (
                <div
                  key={id}
                  onClick={() => onNoteClick(k.note)}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    position: 'absolute',
                    left: k.x,
                    top: 0,
                    width: W_W,
                    height: W_H,
                    zIndex: 1,
                    background: whiteKeyGradient(inScale, isRoot, hov),
                    border: `1px solid ${whiteKeyBorder(inScale, isRoot)}`,
                    borderTop: 'none',
                    borderRadius: '0 0 6px 6px',
                    cursor: 'pointer',
                    boxShadow: isRoot
                      ? 'inset 0 -5px 0 rgba(0,0,0,0.18), 0 4px 12px rgba(251,191,36,0.4)'
                      : inScale
                      ? 'inset 0 -5px 0 rgba(0,0,0,0.1), 0 2px 6px rgba(251,191,36,0.15)'
                      : 'inset 0 -5px 0 rgba(0,0,0,0.07), inset -1px 0 0 rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingBottom: 7,
                    gap: 2,
                    transition: 'filter 0.06s ease',
                    filter: hov ? 'brightness(0.93)' : 'brightness(1)',
                    userSelect: 'none',
                  }}>
                  {/* Root indicator dot */}
                  {isRoot && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#92400e', marginBottom: 2,
                      boxShadow: '0 0 4px rgba(146,64,14,0.6)',
                    }} />
                  )}
                  <span style={{
                    fontSize: 11,
                    fontWeight: (isRoot || inScale) ? 700 : 500,
                    color: isRoot ? '#dbeafe' : inScale ? '#78350f' : '#9ca3af',
                    letterSpacing: '0.03em',
                  }}>
                    {label(k.note, fd)}
                  </span>
                </div>
              )
            })}

            {/* ── Black keys (rendered on top) ── */}
            {BLACK_KEYS.map(k => {
              const fd = noteData.get(k.note)
              const inScale = !!fd
              const isRoot  = fd?.isRoot ?? false
              const id = `${k.note}${k.octave}`
              const hov = hovered === id

              return (
                <div
                  key={id}
                  onClick={() => onNoteClick(k.note)}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    position: 'absolute',
                    left: k.x,
                    top: 0,
                    width: B_W,
                    height: B_H,
                    zIndex: 3,
                    background: blackKeyGradient(inScale, isRoot, hov),
                    borderRadius: '0 0 5px 5px',
                    border: `1px solid ${isRoot ? '#0d9488' : inScale ? '#0f766e' : '#000'}`,
                    borderTop: 'none',
                    cursor: 'pointer',
                    boxShadow: blackKeyShadow(inScale, isRoot),
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: 7,
                    filter: hov ? 'brightness(1.2)' : 'brightness(1)',
                    transition: 'filter 0.06s ease',
                    userSelect: 'none',
                  }}>
                  {/* Shine strip at top */}
                  <div style={{
                    position: 'absolute',
                    top: 2, left: 3, right: 3, height: 18,
                    borderRadius: '0 0 3px 3px',
                    background: isRoot
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)'
                      : inScale
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%)',
                    pointerEvents: 'none',
                  }} />

                  {/* Note label — vertical text */}
                  <span style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    color: isRoot ? '#bfdbfe' : inScale ? '#5eead4' : '#52525b',
                    writingMode: 'vertical-lr',
                    textOrientation: 'mixed',
                    transform: 'rotate(180deg)',
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                  }}>
                    {label(k.note, fd)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Bottom shadow rail */}
          <div style={{
            width: TOTAL_W,
            height: 12,
            background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
          }} />
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 text-[11px] text-gray-500 px-1">
        <div className="flex items-center gap-1.5">
          <div style={{
            width: 20, height: 14, borderRadius: 3,
            background: 'linear-gradient(170deg, #fef3c7, #fbbf24)',
            border: '1px solid #d97706',
          }} />
          <span>Escala (blanca)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{
            width: 14, height: 14, borderRadius: 3,
            background: 'linear-gradient(170deg, #2dd4bf, #0d9488)',
            border: '1px solid #0f766e',
          }} />
          <span>Escala (negra)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{
            width: 20, height: 14, borderRadius: 3,
            background: 'linear-gradient(170deg, #fbbf24, #d97706)',
            border: '1px solid #b45309',
          }} />
          <span>Raíz</span>
        </div>
      </div>
    </div>
  )
}
