import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  CHROMATIC_NOTES,
  getNoteAtFret,
  NOTE_TO_SOLFEGE,
  STANDARD_TUNING,
  computeFretboard,
} from '../data/notes'
import { BUILT_IN_SCALES } from '../data/scales'
import type { NoteName, Scale } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Passive timer hook
// ─────────────────────────────────────────────────────────────────────────────

function useTimer() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0')
  const ss = (seconds % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

const PRACTICE_FRETS = 12
const CELL_H         = 58
const LABEL_W        = 36
const DOT            = 32
const STRING_LABELS    = ['G', 'D', 'A', 'E']
const STRING_THICKNESS = [1, 2, 3, 4]
const STRING_COLORS    = ['#b0b8c8', '#9099a8', '#707888', '#505868']

function getFW(fret: number): number {
  if (fret === 0) return 44
  return Math.max(26, Math.round(72 * Math.pow(2, -(fret - 1) / 12)))
}
const FRET_WIDTHS = [getFW(0), ...Array.from({ length: PRACTICE_FRETS }, (_, i) => getFW(i + 1))]

function ri(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function openNote(s: number): NoteName {
  return STANDARD_TUNING[3 - s]
}
function solfege(n: NoteName) {
  return NOTE_TO_SOLFEGE[n]
}
function posKey(s: number, f: number) {
  return `${s}-${f}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Fretboard compartido entre modos
// ─────────────────────────────────────────────────────────────────────────────

interface CellState {
  type: 'hidden' | 'root' | 'correct' | 'wrong' | 'empty'
  label?: string
}

interface PracticeFretboardProps {
  getCellState: (s: number, f: number) => CellState
  onCellClick?: (s: number, f: number) => void
}

function PracticeFretboard({ getCellState, onCellClick }: PracticeFretboardProps) {
  const frets = [0, ...Array.from({ length: PRACTICE_FRETS }, (_, i) => i + 1)]

  return (
    <div className="overflow-x-auto select-none">
      <div className="inline-flex flex-col">
        {/* Fretboard body */}
        <div className="flex rounded-t overflow-hidden border border-amber-900/50">
          {/* String labels */}
          <div className="flex flex-col flex-shrink-0 bg-gray-900 border-r border-gray-700" style={{ width: LABEL_W }}>
            {[0, 1, 2, 3].map(s => (
              <div key={s} className="flex items-center justify-center text-xs font-bold text-gray-500"
                style={{ height: CELL_H }}>
                {STRING_LABELS[s]}
              </div>
            ))}
          </div>

          {/* Fret columns */}
          {frets.map(fret => (
            <div key={fret}
              className="flex flex-col flex-shrink-0 bg-amber-950"
              style={{
                width: FRET_WIDTHS[fret],
                borderRight: fret === 0 ? '4px solid #d1d5db' : '1px solid #4b5563',
              }}
            >
              {[0, 1, 2, 3].map(s => {
                const cs = getCellState(s, fret)
                const clickable = onCellClick && cs.type !== 'root' && cs.type !== 'correct'
                return (
                  <div key={s}
                    onClick={() => clickable && onCellClick(s, fret)}
                    className="relative flex items-center justify-center"
                    style={{
                      height: CELL_H,
                      cursor: clickable && cs.type === 'empty' ? 'pointer' : 'default',
                    }}
                  >
                    {/* String line */}
                    <span className="absolute inset-x-0 pointer-events-none" style={{
                      height: STRING_THICKNESS[s],
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: STRING_COLORS[s],
                    }} />

                    {/* Dot */}
                    {cs.type === 'root' && (
                      <span className="relative z-10 flex items-center justify-center rounded-full
                        bg-amber-400 text-amber-950 font-black text-xs ring-2 ring-amber-300/40"
                        style={{ width: DOT, height: DOT, fontSize: 11 }}>
                        {cs.label}
                      </span>
                    )}
                    {cs.type === 'correct' && (
                      <span className="relative z-10 flex items-center justify-center rounded-full
                        bg-teal-500 text-gray-950 font-black text-xs"
                        style={{ width: DOT, height: DOT, fontSize: 11 }}>
                        {cs.label}
                      </span>
                    )}
                    {cs.type === 'wrong' && (
                      <span className="relative z-10 flex items-center justify-center rounded-full
                        bg-red-500 text-white font-bold text-xs animate-pulse"
                        style={{ width: DOT, height: DOT, fontSize: 11 }}>
                        ✗
                      </span>
                    )}
                    {cs.type === 'empty' && (
                      <span className="relative z-10 flex items-center justify-center rounded-full
                        border-2 border-gray-500 hover:border-teal-400 transition-colors"
                        style={{ width: DOT, height: DOT }}>
                      </span>
                    )}
                    {/* cs.type === 'hidden' → nothing over the string line */}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Fret numbers */}
        <div className="flex bg-gray-900/80 rounded-b border-x border-b border-amber-900/30">
          <div className="flex-shrink-0" style={{ width: LABEL_W }} />
          {frets.map(fret => (
            <div key={fret} className="flex-shrink-0 flex items-center justify-center"
              style={{ width: FRET_WIDTHS[fret], height: 20 }}>
              {fret > 0 && (
                <span className="text-gray-600 text-[9px]">{fret}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Note picker — 12 botones en 2 filas
// ─────────────────────────────────────────────────────────────────────────────

function NotePicker({
  onPick,
  exclude = [],
}: {
  onPick: (n: NoteName) => void
  exclude?: NoteName[]
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 p-4 bg-gray-900 rounded-xl border border-gray-700">
      {CHROMATIC_NOTES.map(note => (
        <button
          key={note}
          onClick={() => onPick(note)}
          disabled={exclude.includes(note)}
          className="w-14 py-2 rounded-lg bg-gray-800 text-gray-200 font-bold text-sm
            hover:bg-teal-700 hover:text-white transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {solfege(note)}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Circle note picker — 12 notas en rueda SVG
// ─────────────────────────────────────────────────────────────────────────────

function CircleNotePicker({
  onPick,
  picked,
  correct,
}: {
  onPick: (n: NoteName) => void
  picked: NoteName | null
  correct: NoteName
}) {
  const CX = 160, CY = 160, R = 122, BTN_R = 24

  return (
    <svg viewBox="0 0 320 320" className="mx-auto w-full max-w-xs">
      {/* Subtle ring guide */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e293b" strokeWidth={1} />

      {CHROMATIC_NOTES.map((note, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180)
        const x = CX + R * Math.cos(angle)
        const y = CY + R * Math.sin(angle)

        const isCorrect = picked && note === correct
        const isWrong   = picked && note === picked && picked !== correct
        const isIdle    = !picked

        let fill   = '#1e293b'
        let stroke = '#334155'
        let txtCol = '#94a3b8'

        if (isCorrect) { fill = '#0f766e'; stroke = '#2dd4bf'; txtCol = '#fff' }
        if (isWrong)   { fill = '#991b1b'; stroke = '#f87171'; txtCol = '#fff' }

        return (
          <g
            key={note}
            onClick={() => isIdle && onPick(note)}
            style={{ cursor: isIdle ? 'pointer' : 'default' }}
          >
            <circle
              cx={x} cy={y} r={BTN_R}
              fill={fill} stroke={stroke} strokeWidth={isCorrect || isWrong ? 2 : 1}
              className={isIdle ? 'hover:fill-slate-700 transition-all' : ''}
            />
            <text
              x={x} y={y}
              textAnchor="middle" dominantBaseline="central"
              fill={txtCol}
              fontSize={note.includes('#') ? 10 : 11}
              fontWeight="bold"
              style={{ pointerEvents: 'none', fontFamily: 'sans-serif' }}
            >
              {NOTE_TO_SOLFEGE[note]}
            </text>
          </g>
        )
      })}

      {/* Centro: interrogante o resultado */}
      <text
        x={CX} y={CY}
        textAnchor="middle" dominantBaseline="central"
        fontSize={picked ? 28 : 32}
        fontWeight="black"
        fill={picked ? (picked === correct ? '#2dd4bf' : '#f87171') : '#334155'}
        style={{ fontFamily: 'sans-serif', pointerEvents: 'none' }}
      >
        {picked ? (picked === correct ? '✓' : '✗') : '?'}
      </text>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MODO CIEGO
// ─────────────────────────────────────────────────────────────────────────────

function BlindMode({ onExit }: { onExit: () => void }) {
  const [pos,   setPos]   = useState({ s: ri(0, 3), f: ri(1, PRACTICE_FRETS) })
  const [picked, setPicked] = useState<NoteName | null>(null)
  const [score,  setScore]  = useState({ correct: 0, total: 0 })
  const timer = useTimer()

  const correct = getNoteAtFret(openNote(pos.s), pos.f)

  const next = useCallback(() => {
    setPos({ s: ri(0, 3), f: ri(1, PRACTICE_FRETS) })
    setPicked(null)
  }, [])

  function handlePick(note: NoteName) {
    if (picked) return
    setPicked(note)
    setScore(sc => ({
      correct: sc.correct + (note === correct ? 1 : 0),
      total: sc.total + 1,
    }))
    setTimeout(next, 1500)
  }

  function getCellState(s: number, f: number): CellState {
    if (s !== pos.s || f !== pos.f) return { type: 'hidden' }
    if (!picked) return { type: 'empty' }
    return { type: picked === correct ? 'correct' : 'wrong', label: solfege(correct) }
  }

  const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      {/* Score */}
      <div className="flex items-center gap-4">
        <span className="text-2xl font-black text-amber-400">{score.correct}</span>
        <span className="text-gray-600">/</span>
        <span className="text-lg text-gray-400">{score.total}</span>
        {score.total > 0 && (
          <span className="text-sm text-teal-400 font-semibold">{pct}%</span>
        )}
        <span className="ml-auto text-xs text-gray-700 tabular-nums">{timer}</span>
        <button onClick={next} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          Saltar →
        </button>
      </div>

      {/* Instruction */}
      <p className="text-gray-400 text-sm">
        ¿Qué nota hay en{' '}
        <span className="text-white font-semibold">cuerda {STRING_LABELS[pos.s]}, traste {pos.f}</span>?
      </p>

      {/* Fretboard */}
      <PracticeFretboard getCellState={getCellState} />

      {/* Circle picker + feedback label */}
      <div className="flex flex-col items-center gap-2">
        <CircleNotePicker onPick={handlePick} picked={picked} correct={correct} />
        {picked && (
          <p className={`text-sm font-bold ${picked === correct ? 'text-teal-400' : 'text-red-400'}`}>
            {picked === correct ? `¡Correcto! Es ${solfege(correct)}` : `Era ${solfege(correct)}`}
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MODO RECORDAR — setup
// ─────────────────────────────────────────────────────────────────────────────

function RememberSetup({
  root, scale, onRootChange, onScaleChange, onStart, onExit,
}: {
  root: NoteName
  scale: Scale
  onRootChange: (n: NoteName) => void
  onScaleChange: (s: Scale) => void
  onStart: () => void
  onExit: () => void
}) {
  function randomize() {
    onRootChange(CHROMATIC_NOTES[ri(0, 11)])
    onScaleChange(BUILT_IN_SCALES[ri(0, BUILT_IN_SCALES.length - 1)])
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <p className="text-gray-400 text-sm">
        Elegí una escala y una raíz. El diapasón te mostrará la raíz y tenés que completar las notas restantes.
      </p>

      {/* Root selector */}
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">Raíz</p>
        <div className="flex flex-wrap gap-2">
          {CHROMATIC_NOTES.map(n => (
            <button key={n}
              onClick={() => onRootChange(n)}
              className={`w-12 h-9 rounded-lg text-sm font-bold transition-colors
                ${root === n ? 'bg-amber-700 text-amber-100' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {solfege(n)}
            </button>
          ))}
        </div>
      </div>

      {/* Scale selector */}
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">Escala</p>
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
          {BUILT_IN_SCALES.map(s => (
            <button key={s.id}
              onClick={() => onScaleChange(s)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors
                ${scale.id === s.id
                  ? 'bg-teal-800/60 text-teal-200 font-semibold'
                  : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700'}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={randomize}
          className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-semibold hover:bg-gray-700 transition-colors">
          🎲 Aleatorio
        </button>
        <button onClick={onStart}
          className="flex-1 py-2.5 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-600 transition-colors">
          Empezar →
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MODO RECORDAR — juego
// ─────────────────────────────────────────────────────────────────────────────

function RememberGame({
  root, scale, onRestart, onExit,
}: {
  root: NoteName
  scale: Scale
  onRestart: () => void
  onExit: () => void
}) {
  const positions = useMemo(
    () => computeFretboard(root, scale, PRACTICE_FRETS, 'all', undefined),
    [root, scale],
  )

  const [guesses, setGuesses] = useState<Map<string, 'correct' | 'wrong'>>(new Map())
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)
  const timer = useTimer()

  const nonRootPos = positions.filter(p => !p.isRoot)
  const completed  = [...guesses.values()].filter(v => v === 'correct').length
  const total      = nonRootPos.length
  const won        = completed === total && total > 0

  function getCellState(s: number, f: number): CellState {
    const p = positions.find(p => p.string === s && p.fret === f)
    if (!p) return { type: 'hidden' }
    const key = posKey(s, f)

    if (p.isRoot)                      return { type: 'root',    label: solfege(p.note) }
    if (guesses.get(key) === 'correct') return { type: 'correct', label: solfege(p.note) }
    if (key === wrongFlash)             return { type: 'wrong' }
    return { type: 'empty' }
  }

  function handleCellClick(s: number, f: number) {
    const p = positions.find(p => p.string === s && p.fret === f)
    if (!p || p.isRoot) return
    const key = posKey(s, f)
    if (guesses.get(key) === 'correct') return
    setActiveKey(key)
  }

  function handleGuess(note: NoteName) {
    if (!activeKey) return
    const p = positions.find(p => posKey(p.string, p.fret) === activeKey)
    if (!p) return
    if (note === p.note) {
      setGuesses(g => new Map(g).set(activeKey, 'correct'))
      setActiveKey(null)
    } else {
      setWrongFlash(activeKey)
      setTimeout(() => setWrongFlash(null), 700)
    }
  }

  const alreadyCorrect = [...guesses.entries()]
    .filter(([, v]) => v === 'correct')
    .map(([k]) => {
      const [s, f] = k.split('-').map(Number)
      const p = positions.find(p => p.string === s && p.fret === f)
      return p?.note
    })
    .filter(Boolean) as NoteName[]

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <span className="text-amber-400 font-black text-lg">{solfege(root)} {scale.name}</span>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-teal-400 font-bold">{completed}</span>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">{total}</span>
        </div>
        <span className="text-xs text-gray-700 tabular-nums">{timer}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-500"
          style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }}
        />
      </div>

      {/* Fretboard */}
      <PracticeFretboard getCellState={getCellState} onCellClick={handleCellClick} />

      {/* Note picker */}
      {activeKey && !won && (
        <div>
          <p className="text-xs text-gray-500 mb-2 text-center">¿Qué nota es?</p>
          <NotePicker
            onPick={handleGuess}
            exclude={alreadyCorrect}
          />
        </div>
      )}

      {/* Win */}
      {won && (
        <div className="flex flex-col items-center gap-4 py-6 bg-teal-900/30 border border-teal-700/40 rounded-2xl">
          <span className="text-4xl">🎸</span>
          <p className="text-teal-300 text-xl font-black">¡Perfecto! Completaste {solfege(root)} {scale.name}</p>
          <div className="flex gap-3">
            <button onClick={onRestart}
              className="px-5 py-2.5 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-600 transition-colors">
              Otra escala
            </button>
            <button onClick={onExit}
              className="px-5 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
              Salir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MODO RECORDAR — wrapper con setup
// ─────────────────────────────────────────────────────────────────────────────

function RememberMode({ onExit }: { onExit: () => void }) {
  const [root,    setRoot]    = useState<NoteName>('A')
  const [scale,   setScale]   = useState<Scale>(BUILT_IN_SCALES.find(s => s.id === 'minor-pentatonic')!)
  const [started, setStarted] = useState(false)

  if (!started) {
    return (
      <RememberSetup
        root={root} scale={scale}
        onRootChange={setRoot} onScaleChange={setScale}
        onStart={() => setStarted(true)}
        onExit={onExit}
      />
    )
  }

  return (
    <RememberGame
      root={root} scale={scale}
      onRestart={() => setStarted(false)}
      onExit={onExit}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MENÚ PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

type GameMode = 'menu' | 'blind' | 'remember'

function ModeMenu({ onSelect }: { onSelect: (m: GameMode) => void }) {
  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto">
      <button
        onClick={() => onSelect('blind')}
        className="flex flex-col gap-1.5 p-5 rounded-2xl bg-gray-800 border border-gray-700
          hover:border-amber-700/60 hover:bg-amber-900/20 transition-colors text-left"
      >
        <span className="text-xl">🎯</span>
        <span className="text-white font-bold text-base">Modo Ciego</span>
        <span className="text-gray-500 text-sm">
          Aparece una nota en el diapasón y tenés que identificar cuál es.
        </span>
      </button>

      <button
        onClick={() => onSelect('remember')}
        className="flex flex-col gap-1.5 p-5 rounded-2xl bg-gray-800 border border-gray-700
          hover:border-teal-700/60 hover:bg-teal-900/20 transition-colors text-left"
      >
        <span className="text-xl">🧠</span>
        <span className="text-white font-bold text-base">Modo Recordar</span>
        <span className="text-gray-500 text-sm">
          Elegís una escala y tenés que completar todas sus notas en el mástil.
        </span>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT — componente principal
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean
  onClose: () => void
}

export default function PracticeMode({ visible, onClose }: Props) {
  const [mode, setMode] = useState<GameMode>('menu')

  function handleExit() {
    setMode('menu')
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        {mode !== 'menu' && (
          <button
            onClick={handleExit}
            className="text-gray-500 hover:text-gray-300 transition-colors text-sm font-medium"
          >
            ← Modos
          </button>
        )}
        <span className="font-black text-white text-base">
          {mode === 'menu'    && '🎮 Práctica'}
          {mode === 'blind'   && '🎯 Modo Ciego'}
          {mode === 'remember'&& '🧠 Modo Recordar'}
        </span>
        <button
          onClick={onClose}
          className="ml-auto text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {mode === 'menu'     && <ModeMenu onSelect={setMode} />}
        {mode === 'blind'    && <BlindMode  onExit={handleExit} />}
        {mode === 'remember' && <RememberMode onExit={handleExit} />}
      </div>
    </div>
  )
}
