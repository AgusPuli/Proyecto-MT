import { useEffect, useMemo, useRef, useState } from 'react'
import { NOTE_TO_SOLFEGE } from '../data/notes'
import type { FretNote, LabelMode, NoteName } from '../types'

interface PianoProps {
  notes: FretNote[]
  labelMode: LabelMode
  onNoteClick: (note: NoteName) => void
}

// ─── Piano range: C2 → C7 (5 octaves, 36 white keys) ─────────────────────────
const OCTAVE_START = 2
const OCTAVE_END   = 7
const GAP          = 2   // px gap between white keys

const ALL_NOTES: NoteName[] = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const IS_WHITE = new Set<NoteName>(['C','D','E','F','G','A','B'])
const BLACK_GAP: Record<string, number> = { 'C#':1, 'D#':2, 'F#':4, 'G#':5, 'A#':6 }

interface KeyInfo {
  note: NoteName
  octave: number
  isWhite: boolean
  wIdx?: number     // index among all white keys
  octBase?: number  // white keys before this octave (for black key positioning)
  bGap?: number     // black key gap index within octave
}

function buildKeys(): KeyInfo[] {
  const keys: KeyInfo[] = []
  let wIdx = 0
  for (let oct = OCTAVE_START; oct <= OCTAVE_END; oct++) {
    const count    = oct === OCTAVE_END ? 1 : 12
    const octBase  = (oct - OCTAVE_START) * 7
    for (let i = 0; i < count; i++) {
      const note    = ALL_NOTES[i]
      const isWhite = IS_WHITE.has(note)
      keys.push(isWhite
        ? { note, octave: oct, isWhite, wIdx: wIdx++ }
        : { note, octave: oct, isWhite, octBase, bGap: BLACK_GAP[note] }
      )
    }
  }
  return keys
}

const ALL_KEYS   = buildKeys()
const WHITE_KEYS = ALL_KEYS.filter(k => k.isWhite)
const BLACK_KEYS = ALL_KEYS.filter(k => !k.isWhite)

// ─── Visual helpers ───────────────────────────────────────────────────────────

function whiteGrad(inScale: boolean, isRoot: boolean, hov: boolean) {
  if (isRoot)  return 'linear-gradient(175deg, #93c5fd 0%, #3b82f6 55%, #1d4ed8 100%)'
  if (inScale) return 'linear-gradient(175deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)'
  if (hov)     return 'linear-gradient(175deg, #f3f4f6 0%, #e5e7eb 100%)'
  return         'linear-gradient(175deg, #f9fafb 0%, #ffffff 20%, #e5e7eb 85%, #d1d5db 100%)'
}

function blackGrad(inScale: boolean, isRoot: boolean, hov: boolean) {
  if (isRoot)  return 'linear-gradient(175deg, #60a5fa 0%, #2563eb 50%, #1e3a8a 100%)'
  if (inScale) return 'linear-gradient(175deg, #fde68a 0%, #fbbf24 40%, #d97706 70%, #92400e 100%)'
  if (hov)     return 'linear-gradient(175deg, #6b7280 0%, #4b5563 40%, #374151 100%)'
  return         'linear-gradient(175deg, #52525b 0%, #3f3f46 20%, #27272a 55%, #18181b 80%, #09090b 100%)'
}

function whiteBorder(inScale: boolean, isRoot: boolean) {
  if (isRoot)  return '#1d4ed8'
  if (inScale) return '#d97706'
  return '#9ca3af'
}

function blackShadow(inScale: boolean, isRoot: boolean) {
  const base = '2px 6px 14px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)'
  if (isRoot)  return `${base}, 0 0 18px rgba(59,130,246,0.7)`
  if (inScale) return `${base}, 0 0 10px rgba(251,191,36,0.5)`
  return base
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Piano({ notes, labelMode, onNoteClick }: PianoProps) {
  const [hovered,  setHovered]  = useState<string | null>(null)
  const [keyW,     setKeyW]     = useState(52)   // white key width, starts at 52 then fills
  const containerRef            = useRef<HTMLDivElement>(null)

  // Measure container and compute white key width to fill available space
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const calc = () => {
      const avail = el.clientWidth - 32  // subtract px padding inside the panel
      const w = Math.max(40, Math.floor((avail + GAP) / WHITE_KEYS.length) - GAP)
      setKeyW(w)
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Derived dimensions — scale proportionally with key width
  const step = keyW + GAP
  const wh   = Math.min(240, Math.max(180, Math.round(keyW * 4.0)))  // height ≈ 4× width
  const bw   = Math.round(keyW * 0.60)
  const bh   = Math.round(wh  * 0.63)
  const totalW = WHITE_KEYS.length * step - GAP

  // Label font sizes
  const wFontSize = Math.max(10, Math.min(15, Math.round(keyW * 0.29)))
  const bFontSize = Math.max(8,  Math.min(11, Math.round(bw  * 0.37)))

  // Key position helpers
  const whiteX = (k: KeyInfo) => k.wIdx! * step
  const blackX = (k: KeyInfo) => (k.octBase! + k.bGap!) * step - bw / 2

  // note → FretNote lookup
  const noteData = useMemo(() => {
    const m = new Map<NoteName, FretNote>()
    notes.forEach(n => { if (!m.has(n.note)) m.set(n.note, n) })
    return m
  }, [notes])

  function getLabel(note: NoteName, fd?: FretNote): string {
    if (!fd) return labelMode === 'solfege' ? NOTE_TO_SOLFEGE[note] : note
    switch (labelMode) {
      case 'solfege':  return NOTE_TO_SOLFEGE[note]
      case 'interval': return fd.interval
      case 'degree':   return fd.degree
      default:         return note
    }
  }

  return (
    <div className="select-none flex flex-col gap-3" ref={containerRef}>

      {/* ── Piano body ──────────────────────────────────────────────────────── */}
      <div className="bg-gray-950 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
          <span className="text-sm">🎹</span>
          <span className="text-xs text-gray-400 font-semibold tracking-widest uppercase">Piano</span>
          <span className="ml-auto text-[10px] text-gray-600">C2 – C7 · Click para cambiar raíz</span>
        </div>

        {/* Keys area — no scroll (fills width) */}
        <div style={{ background: '#09090b', padding: '0 16px' }}>
          {/* Top shadow */}
          <div style={{ height: 10, background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />

          {/* Keys container */}
          <div style={{ position: 'relative', width: totalW, height: wh }}>

            {/* White keys */}
            {WHITE_KEYS.map(k => {
              const fd      = noteData.get(k.note)
              const inScale = !!fd
              const isRoot  = fd?.isRoot ?? false
              const id      = `${k.note}${k.octave}`
              const hov     = hovered === id

              return (
                <div key={id}
                  onClick={() => onNoteClick(k.note)}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    position: 'absolute',
                    left: whiteX(k), top: 0,
                    width: keyW, height: wh,
                    zIndex: 1,
                    background: whiteGrad(inScale, isRoot, hov),
                    border: `1px solid ${whiteBorder(inScale, isRoot)}`,
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    cursor: 'pointer',
                    boxShadow: isRoot
                      ? 'inset 0 -6px 0 rgba(0,0,0,0.18), 0 4px 14px rgba(59,130,246,0.35)'
                      : inScale
                      ? 'inset 0 -6px 0 rgba(0,0,0,0.1), 0 2px 6px rgba(251,191,36,0.15)'
                      : 'inset 0 -6px 0 rgba(0,0,0,0.07), inset -1px 0 0 rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'flex-end',
                    paddingBottom: 10, gap: 3,
                    filter: hov ? 'brightness(0.93)' : 'brightness(1)',
                    transition: 'filter 0.06s ease',
                    userSelect: 'none',
                  }}>
                  {isRoot && (
                    <div style={{
                      width: Math.max(7, Math.round(keyW * 0.18)),
                      height: Math.max(7, Math.round(keyW * 0.18)),
                      borderRadius: '50%',
                      background: '#1d4ed8',
                      boxShadow: '0 0 6px rgba(59,130,246,0.8)',
                    }} />
                  )}
                  <span style={{
                    fontSize: wFontSize,
                    fontWeight: (isRoot || inScale) ? 700 : 500,
                    color: isRoot ? '#dbeafe' : inScale ? '#78350f' : '#9ca3af',
                    letterSpacing: '0.03em',
                  }}>
                    {getLabel(k.note, fd)}
                  </span>
                </div>
              )
            })}

            {/* Black keys */}
            {BLACK_KEYS.map(k => {
              const fd      = noteData.get(k.note)
              const inScale = !!fd
              const isRoot  = fd?.isRoot ?? false
              const id      = `${k.note}${k.octave}`
              const hov     = hovered === id

              return (
                <div key={id}
                  onClick={() => onNoteClick(k.note)}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    position: 'absolute',
                    left: blackX(k), top: 0,
                    width: bw, height: bh,
                    zIndex: 3,
                    background: blackGrad(inScale, isRoot, hov),
                    borderRadius: '0 0 6px 6px',
                    border: `1px solid ${isRoot ? '#1d4ed8' : inScale ? '#b45309' : '#000'}`,
                    borderTop: 'none',
                    cursor: 'pointer',
                    boxShadow: blackShadow(inScale, isRoot),
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    paddingBottom: 8,
                    filter: hov ? 'brightness(1.25)' : 'brightness(1)',
                    transition: 'filter 0.06s ease',
                    userSelect: 'none',
                  }}>
                  {/* Shine strip */}
                  <div style={{
                    position: 'absolute',
                    top: 2, left: 3, right: 3,
                    height: Math.round(bh * 0.18),
                    borderRadius: '0 0 3px 3px',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
                    pointerEvents: 'none',
                  }} />
                  <span style={{
                    fontSize: bFontSize,
                    fontWeight: 700,
                    color: isRoot ? '#bfdbfe' : inScale ? '#78350f' : '#52525b',
                    writingMode: 'vertical-lr',
                    transform: 'rotate(180deg)',
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                  }}>
                    {getLabel(k.note, fd)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Bottom shadow */}
          <div style={{ height: 14, background: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 100%)' }} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-gray-500 px-1">
        {[
          { grad: 'linear-gradient(170deg,#fef3c7,#fbbf24)', border: '#d97706', w: 20, label: 'Escala' },
          { grad: 'linear-gradient(170deg,#93c5fd,#3b82f6)',  border: '#1d4ed8', w: 20, label: 'Raíz' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div style={{ width: l.w, height: 14, borderRadius: 3, background: l.grad, border: `1px solid ${l.border}` }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
