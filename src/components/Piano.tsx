import { useEffect, useMemo, useRef, useState } from 'react'
import { NOTE_TO_SOLFEGE } from '../data/notes'
import type { FretNote, LabelMode, NoteName } from '../types'

interface PianoProps {
  notes: FretNote[]
  labelMode: LabelMode
  onNoteClick: (note: NoteName) => void
}

// ─── Rango del teclado ────────────────────────────────────────────────────────
// Arranca en C2 y por defecto muestra 5 octavas (C2 → C7). Los botones −/+
// agregan o sacan octavas por arriba; menos octavas = teclas más grandes,
// porque el ancho se reparte entre las teclas que queden.
const OCTAVE_START = 2
const MIN_OCTAVES  = 1
const MAX_OCTAVES  = 6
const DEF_OCTAVES  = 4

// Zoom manual, encima del ancho que se calcula para llenar el panel.
const MIN_ZOOM  = 0.6
const MAX_ZOOM  = 2.0
const ZOOM_STEP = 0.15

// Límites del ancho de tecla blanca en px.
const MIN_KEY_W = 22
const MAX_KEY_W = 110

const GAP = 2   // px gap between white keys

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

/** Octavas completas + el Do de cierre, como en un teclado real. */
function buildKeys(octaves: number): KeyInfo[] {
  const keys: KeyInfo[] = []
  const endOct = OCTAVE_START + octaves
  let wIdx = 0
  for (let oct = OCTAVE_START; oct <= endOct; oct++) {
    const count    = oct === endOct ? 1 : 12
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

// ─── Visual language ──────────────────────────────────────────────────────────
// Las teclas conservan su color natural (marfil / negro). La pertenencia a la
// escala se comunica con un badge circular al pie de la tecla y un lavado de
// color suave en el tercio inferior: así el teclado se sigue leyendo como un
// teclado y las notas de la escala saltan sin que "se mezcle todo".

const SCALE = { solid: '#f59e0b', soft: 'rgba(245,158,11,0.30)', ink: '#1c1917', edge: '#b45309' }
const ROOT  = { solid: '#ff3b2c', soft: 'rgba(255,59,44,0.40)', ink: '#f8fafc', edge: '#a8241a' }

const accentOf = (inScale: boolean, isRoot: boolean) =>
  isRoot ? ROOT : inScale ? SCALE : null

function whiteGrad(hov: boolean) {
  return hov
    ? 'linear-gradient(175deg, #eef2f7 0%, #dee3ea 100%)'
    : 'linear-gradient(175deg, #ffffff 0%, #fbfcfe 45%, #e8ecf2 88%, #d7dce4 100%)'
}

function blackGrad(hov: boolean) {
  return hov
    ? 'linear-gradient(175deg, #55555d 0%, #3a3a42 45%, #212127 100%)'
    : 'linear-gradient(175deg, #45454d 0%, #303038 25%, #1b1b21 60%, #0d0d11 100%)'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Piano({ notes, labelMode, onNoteClick }: PianoProps) {
  const [hovered,  setHovered]  = useState<string | null>(null)
  const [octaves,  setOctaves]  = useState(DEF_OCTAVES)
  const [zoom,     setZoom]     = useState(1)
  const [avail,    setAvail]    = useState(900)   // ancho útil del panel
  const containerRef            = useRef<HTMLDivElement>(null)

  const { WHITE_KEYS, BLACK_KEYS } = useMemo(() => {
    const all = buildKeys(octaves)
    return {
      WHITE_KEYS: all.filter(k => k.isWhite),
      BLACK_KEYS: all.filter(k => !k.isWhite),
    }
  }, [octaves])

  // Measure container — el ancho de tecla se deriva de acá
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const calc = () => setAvail(Math.max(120, el.clientWidth - 32))  // menos el padding del panel
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Ancho de tecla: el que llena el panel con las octavas visibles, por el zoom.
  // Con zoom 1 siempre entra justo (sin scroll horizontal); menos octavas ⇒ teclas
  // más grandes. El zoom es lo único que puede llegar a desbordar.
  const fitW = Math.floor((avail + GAP) / WHITE_KEYS.length) - GAP
  const keyW = Math.max(MIN_KEY_W, Math.min(MAX_KEY_W, Math.round(fitW * zoom)))

  // Derived dimensions — scale proportionally with key width
  const step = keyW + GAP
  const wh   = Math.min(300, Math.max(150, Math.round(keyW * 4.0)))  // height ≈ 4× width
  const bw   = Math.round(keyW * 0.60)
  const bh   = Math.round(wh  * 0.63)
  const totalW = WHITE_KEYS.length * step - GAP

  const canZoomOut = zoom > MIN_ZOOM + 0.001 && keyW > MIN_KEY_W
  const canZoomIn  = zoom < MAX_ZOOM - 0.001 && keyW < MAX_KEY_W
  const lastOctave = OCTAVE_START + octaves

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
        <div className="px-4 py-2.5 border-b border-gray-800 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm">🎹</span>
          <span className="text-xs text-gray-400 font-semibold tracking-widest uppercase">Piano</span>

          {/* Octavas */}
          <Stepper
            label="Octavas"
            value={String(octaves)}
            onMinus={() => setOctaves(o => Math.max(MIN_OCTAVES, o - 1))}
            onPlus={() => setOctaves(o => Math.min(MAX_OCTAVES, o + 1))}
            canMinus={octaves > MIN_OCTAVES}
            canPlus={octaves < MAX_OCTAVES}
          />

          {/* Tamaño */}
          <Stepper
            label="Tamaño"
            value={`${Math.round(zoom * 100)}%`}
            onMinus={() => setZoom(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
            onPlus={() => setZoom(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
            canMinus={canZoomOut}
            canPlus={canZoomIn}
            onReset={zoom !== 1 ? () => setZoom(1) : undefined}
          />

          <span className="ml-auto text-[10px] text-gray-600">
            C{OCTAVE_START} – C{lastOctave} · Click para cambiar raíz
          </span>
        </div>

        {/* Keys area — scrollable on small screens */}
        <div style={{ background: '#09090b', padding: '0 16px', overflowX: 'auto', overflowY: 'hidden' }}>
          {/* Top shadow */}
          <div style={{ height: 10, background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />

          {/* Keys container — centrado si sobra ancho, con scroll si el zoom lo desborda */}
          <div style={{ position: 'relative', width: totalW, height: wh, margin: '0 auto' }}>

            {/* White keys */}
            {WHITE_KEYS.map(k => {
              const fd      = noteData.get(k.note)
              const inScale = !!fd
              const isRoot  = fd?.isRoot ?? false
              const id      = `${k.note}${k.octave}`
              const hov     = hovered === id
              const acc     = accentOf(inScale, isRoot)
              const badge   = Math.max(16, Math.round(keyW * 0.68))

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
                    background: whiteGrad(hov),
                    border: `1px solid ${acc ? acc.edge : '#a8afba'}`,
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    cursor: 'pointer',
                    boxShadow: isRoot
                      ? 'inset 0 -7px 0 rgba(0,0,0,0.12), 0 4px 16px rgba(59,130,246,0.35)'
                      : inScale
                      ? 'inset 0 -7px 0 rgba(0,0,0,0.1), 0 3px 10px rgba(245,158,11,0.22)'
                      : 'inset 0 -7px 0 rgba(0,0,0,0.07), inset -1px 0 0 rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'flex-end',
                    paddingBottom: 9,
                    overflow: 'hidden',
                    transition: 'background 0.08s ease',
                    userSelect: 'none',
                  }}>

                  {/* Lavado de color en el tercio inferior — patrón de la escala de un vistazo */}
                  {acc && (
                    <div style={{
                      position: 'absolute', left: 0, right: 0, bottom: 0,
                      height: Math.round(wh * 0.45),
                      background: `linear-gradient(0deg, ${acc.soft} 0%, rgba(255,255,255,0) 100%)`,
                      pointerEvents: 'none',
                    }} />
                  )}

                  {/* Etiqueta: badge sólido si pertenece a la escala, texto tenue si no */}
                  {acc ? (
                    <div style={{
                      position: 'relative',
                      minWidth: badge, height: badge,
                      padding: '0 4px',
                      borderRadius: 999,
                      background: acc.solid,
                      color: acc.ink,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: wFontSize, fontWeight: 800, letterSpacing: '0.02em',
                      boxShadow: isRoot
                        ? '0 0 0 2px rgba(255,255,255,0.85), 0 0 12px rgba(59,130,246,0.75)'
                        : '0 1px 3px rgba(0,0,0,0.35)',
                    }}>
                      {getLabel(k.note, fd)}
                    </div>
                  ) : (
                    <span style={{
                      position: 'relative',
                      fontSize: wFontSize - 1,
                      fontWeight: 500,
                      color: hov ? '#6b7280' : '#b6bcc6',
                      letterSpacing: '0.03em',
                    }}>
                      {getLabel(k.note, fd)}
                    </span>
                  )}
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

              const acc   = accentOf(inScale, isRoot)
              const badge = Math.max(14, Math.round(bw * 0.92))

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
                    background: blackGrad(hov),
                    borderRadius: '0 0 6px 6px',
                    border: `1px solid ${acc ? acc.edge : '#000'}`,
                    borderTop: 'none',
                    cursor: 'pointer',
                    boxShadow: acc
                      ? `2px 6px 14px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 14px ${acc.soft}`
                      : '2px 6px 14px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    paddingBottom: 7,
                    transition: 'background 0.08s ease',
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

                  {/* Lavado inferior para las alteraciones de la escala */}
                  {acc && (
                    <div style={{
                      position: 'absolute', left: 0, right: 0, bottom: 0,
                      height: Math.round(bh * 0.5),
                      borderRadius: '0 0 5px 5px',
                      background: `linear-gradient(0deg, ${acc.soft} 0%, rgba(0,0,0,0) 100%)`,
                      pointerEvents: 'none',
                    }} />
                  )}

                  {acc ? (
                    <div style={{
                      position: 'relative',
                      minWidth: badge, height: badge,
                      padding: '0 3px',
                      borderRadius: 999,
                      background: acc.solid,
                      color: acc.ink,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: bFontSize + 1, fontWeight: 800, lineHeight: 1,
                      boxShadow: isRoot
                        ? '0 0 0 2px rgba(255,255,255,0.75), 0 0 12px rgba(59,130,246,0.8)'
                        : '0 1px 4px rgba(0,0,0,0.6)',
                    }}>
                      {getLabel(k.note, fd)}
                    </div>
                  ) : hov ? (
                    <span style={{
                      position: 'relative',
                      fontSize: bFontSize,
                      fontWeight: 700,
                      color: '#9ca3af',
                      lineHeight: 1,
                    }}>
                      {getLabel(k.note, fd)}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* Bottom shadow */}
          <div style={{ height: 14, background: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 100%)' }} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500 px-1">
        {[
          { bg: ROOT.solid,  ring: '0 0 0 2px rgba(255,255,255,0.7)', label: 'Raíz' },
          { bg: SCALE.solid, ring: 'none',                            label: 'Nota de la escala' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div style={{ width: 14, height: 14, borderRadius: 999, background: l.bg, boxShadow: l.ring }} />
            <span>{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div style={{ width: 14, height: 14, borderRadius: 3, background: '#e8ecf2', border: '1px solid #a8afba' }} />
          <span>Fuera de la escala</span>
        </div>
      </div>
    </div>
  )
}

// ─── Stepper −/+ del header ───────────────────────────────────────────────────

function Stepper({
  label, value, onMinus, onPlus, canMinus, canPlus, onReset,
}: {
  label: string
  value: string
  onMinus: () => void
  onPlus: () => void
  canMinus: boolean
  canPlus: boolean
  onReset?: () => void
}) {
  const btn = (enabled: boolean) =>
    `w-6 h-6 flex items-center justify-center rounded-md text-sm font-bold leading-none transition-colors focus:outline-none ${
      enabled
        ? 'bg-gray-800 text-gray-300 hover:bg-violet-700 hover:text-white'
        : 'bg-gray-900 text-gray-700 cursor-default'
    }`

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{label}</span>
      <div className="flex items-center gap-1 bg-gray-900/70 border border-gray-800 rounded-lg p-0.5">
        <button className={btn(canMinus)} disabled={!canMinus} onClick={onMinus} title={`${label} −`}>−</button>
        <button
          onClick={onReset}
          disabled={!onReset}
          title={onReset ? 'Restablecer' : undefined}
          className={`min-w-[34px] text-center text-[11px] font-bold tabular-nums focus:outline-none ${
            onReset ? 'text-violet-300 hover:text-violet-200 cursor-pointer' : 'text-gray-300 cursor-default'
          }`}
        >
          {value}
        </button>
        <button className={btn(canPlus)} disabled={!canPlus} onClick={onPlus} title={`${label} +`}>+</button>
      </div>
    </div>
  )
}
