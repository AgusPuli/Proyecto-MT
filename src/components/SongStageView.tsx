import { useEffect, useRef, useState } from 'react'
import type { ChordAnalysis } from '../data/harmony'
import type { ParsedLine } from '../data/songParser'
import type { Song } from '../data/songStorage'
import { analysisKey, buildSegments } from './SongPages'

// ─────────────────────────────────────────────────────────────────────────────
// SongStageView — "modo atril": la canción sola, en letra grande, sin paneles,
// con autoscroll al tempo guardado. Pensado para leer mientras tocás.
//   Espacio  play / pausa      ↑ ↓  velocidad
//   + −      tamaño de letra   Esc  salir
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  song: Song
  parsed: ParsedLine[]
  analyses: Map<string, ChordAnalysis>
  onExit: () => void
}

const MIN_FONT = 16
const MAX_FONT = 56
const DEFAULT_TEMPO = 90

// Cuántos beats tarda en pasar una línea de texto. Es la constante que traduce
// el tempo musical a velocidad de scroll; 2 beats/línea es un valor cómodo
// para canciones cantadas y el usuario lo ajusta con la velocidad.
const BEATS_PER_LINE = 2

export default function SongStageView({ song, parsed, analyses, onExit }: Props) {
  const [font, setFont] = useState(30)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)      // multiplicador sobre el tempo
  const [atEnd, setAtEnd] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const tempo = song.tempo ?? DEFAULT_TEMPO
  const lineH = font * 1.7
  const pxPerSec = (tempo / 60 / BEATS_PER_LINE) * lineH * speed

  // Autoscroll con acumulador fraccionario: scrollTop es entero, así que sin
  // acumular se pierden los píxeles decimales y a velocidad baja no avanza.
  useEffect(() => {
    if (!playing) return
    const el = scrollRef.current
    if (!el) return
    let raf = 0
    let last = performance.now()
    let acc = 0
    const tick = (t: number) => {
      const dt = (t - last) / 1000
      last = t
      acc += pxPerSec * dt
      const whole = Math.floor(acc)
      if (whole > 0) {
        acc -= whole
        el.scrollTop += whole
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          setPlaying(false)
          setAtEnd(true)
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, pxPerSec])

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':        e.preventDefault(); toggle(); break
        case 'Escape':   onExit(); break
        case '+': case '=': setFont(f => Math.min(MAX_FONT, f + 2)); break
        case '-':           setFont(f => Math.max(MIN_FONT, f - 2)); break
        case 'ArrowUp':   e.preventDefault(); setSpeed(s => Math.min(3, +(s + 0.1).toFixed(2))); break
        case 'ArrowDown': e.preventDefault(); setSpeed(s => Math.max(0.2, +(s - 0.1).toFixed(2))); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  function toggle() {
    const el = scrollRef.current
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
      el.scrollTop = 0
      setAtEnd(false)
    }
    setPlaying(p => !p)
  }

  function restart() {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setAtEnd(false)
  }

  return (
    <div className="absolute inset-0 z-[55] bg-gray-950 flex flex-col print:hidden">

      {/* ── Barra de control ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 bg-gray-900 flex-wrap flex-shrink-0">
        <button onClick={onExit}
          className="px-2 py-1 text-sm rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors focus:outline-none">
          ← Salir del atril
        </button>

        <span className="text-sm font-bold text-amber-400 truncate max-w-[16rem]">
          {song.title || 'Sin título'}
        </span>

        <button onClick={toggle}
          className={`px-4 py-1.5 text-sm font-bold rounded transition-colors focus:outline-none ${
            playing ? 'bg-amber-400 text-amber-950 hover:bg-amber-300'
                    : 'bg-teal-600 text-white hover:bg-teal-500'}`}>
          {playing ? '⏸ Pausar' : atEnd ? '↺ Desde el principio' : '▶ Reproducir'}
        </button>

        <button onClick={restart}
          title="Volver al principio"
          className="px-2 py-1 text-sm rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors focus:outline-none">
          ⏮
        </button>

        {/* Velocidad */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Velocidad</span>
          <div className="flex items-center gap-1 bg-gray-900/70 border border-gray-800 rounded-lg p-0.5">
            <button onClick={() => setSpeed(s => Math.max(0.2, +(s - 0.1).toFixed(2)))}
              className="w-6 h-6 rounded-md bg-gray-800 text-gray-300 hover:bg-amber-600 hover:text-white text-sm font-bold focus:outline-none">−</button>
            <span className="min-w-[42px] text-center text-[11px] font-bold text-gray-300 tabular-nums">
              {Math.round(speed * 100)}%
            </span>
            <button onClick={() => setSpeed(s => Math.min(3, +(s + 0.1).toFixed(2)))}
              className="w-6 h-6 rounded-md bg-gray-800 text-gray-300 hover:bg-amber-600 hover:text-white text-sm font-bold focus:outline-none">+</button>
          </div>
        </div>

        {/* Tamaño de letra */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Letra</span>
          <div className="flex items-center gap-1 bg-gray-900/70 border border-gray-800 rounded-lg p-0.5">
            <button onClick={() => setFont(f => Math.max(MIN_FONT, f - 2))}
              className="w-6 h-6 rounded-md bg-gray-800 text-gray-300 hover:bg-amber-600 hover:text-white text-xs font-bold focus:outline-none">A−</button>
            <span className="min-w-[28px] text-center text-[11px] font-bold text-gray-300 tabular-nums">{font}</span>
            <button onClick={() => setFont(f => Math.min(MAX_FONT, f + 2))}
              className="w-6 h-6 rounded-md bg-gray-800 text-gray-300 hover:bg-amber-600 hover:text-white text-xs font-bold focus:outline-none">A+</button>
          </div>
        </div>

        <div className="flex-1" />

        <span className="text-[11px] text-gray-600 hidden md:block">
          ♩ = {song.tempo ?? `${DEFAULT_TEMPO} (sin tempo)`} · Espacio: play · ↑↓: velocidad · Esc: salir
        </span>
      </div>

      {/* ── Canción ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 sm:px-12 py-8">
        <div className="mx-auto max-w-4xl font-mono" style={{ fontSize: font, lineHeight: 1.7 }}>
          {parsed.map((line, i) => {
            if (line.type === 'blank') return <div key={i} style={{ height: font }} />
            if (line.type === 'section') {
              return (
                <div key={i}
                  className="text-amber-400 font-sans font-bold uppercase tracking-widest mt-8 mb-3"
                  style={{ fontSize: Math.max(13, font * 0.5) }}>
                  {line.title}
                </div>
              )
            }
            const segments = buildSegments(line.lyrics, line.chords)
            return (
              <div key={i} className="flex flex-wrap items-end mb-2">
                {segments.map((seg, j) => {
                  const a = seg.chord?.chord
                    ? analyses.get(analysisKey(seg.chord.chord.root, seg.chord.chord.quality.id))
                    : undefined
                  return (
                    <span key={j} className="inline-flex flex-col items-start max-w-full">
                      <span
                        className={`font-bold leading-tight ${
                          a?.relation === 'non-diatonic' ? 'text-red-400' : 'text-amber-400'}`}
                        style={{ fontSize: Math.max(12, font * 0.62) }}>
                        {seg.chord ? seg.chord.raw : ' '}
                      </span>
                      <span className="whitespace-pre-wrap break-words text-gray-100">
                        {seg.text || ' '}
                      </span>
                    </span>
                  )
                })}
              </div>
            )
          })}
          {/* Aire al final para que la última línea pueda subir hasta el centro */}
          <div style={{ height: '45vh' }} />
        </div>
      </div>
    </div>
  )
}
