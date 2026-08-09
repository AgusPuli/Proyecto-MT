import { useEffect, useMemo, useState } from 'react'
import { CHROMATIC_NOTES } from '../data/notes'
import {
  CHORD_QUALITIES,
  CATEGORY_COLOR,
  generateChordVoicings,
  getChordNotes,
  chordName,
  positionLabel,
  intervalLabel,
  type ChordQuality,
} from '../data/chords'
import ChordDiagram from './ChordDiagram'
import PianoChordDiagram from './PianoChordDiagram'
import Wheel, { type WheelItem } from './ChordWheel'
import type { NoteName } from '../types'

interface ChordExplorerProps {
  visible: boolean
  onClose: () => void
  tuning: NoteName[]
  totalFrets?: number
  /** 'guitar' muestra diagramas de mástil; 'piano', inversiones en el teclado. */
  mode?: 'guitar' | 'piano'
}

type Step = 'note' | 'quality' | 'voicings'

// ─────────────────────────────────────────────────────────────────────────────
// Chord explorer modal
// ─────────────────────────────────────────────────────────────────────────────

export default function ChordExplorer({
  visible,
  onClose,
  tuning,
  totalFrets = 15,
  mode = 'guitar',
}: ChordExplorerProps) {
  const [step, setStep] = useState<Step>('note')
  const [note, setNote] = useState<NoteName | null>(null)
  const [quality, setQuality] = useState<ChordQuality | null>(null)
  const [hoverNote, setHoverNote] = useState<number | null>(null)
  const [hoverQual, setHoverQual] = useState<number | null>(null)

  // Reset to the first step whenever the modal is (re)opened.
  useEffect(() => {
    if (visible) {
      setStep('note')
      setNote(null)
      setQuality(null)
      setHoverNote(null)
      setHoverQual(null)
    }
  }, [visible])

  // Close on Escape.
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  const voicings = useMemo(() => {
    if (!note || !quality || mode === 'piano') return []
    return generateChordVoicings(note, quality.intervals, tuning, totalFrets)
  }, [note, quality, tuning, totalFrets, mode])

  if (!visible) return null

  const noteItems: WheelItem[] = CHROMATIC_NOTES.map((nn, i) => ({
    id: nn,
    label: nn,
    fill: i === hoverNote ? '#0d9488' : '#155e63',
    text: '#e2e8f0',
    highlight: i === hoverNote,
  }))

  const qualItems: WheelItem[] = CHORD_QUALITIES.map((q, i) => {
    const c = CATEGORY_COLOR[q.category]
    return {
      id: q.id,
      label: q.symbol || 'M',
      fill: c.fill,
      text: c.text,
      highlight: i === hoverQual,
    }
  })

  const headerCrumb = (
    <div className="flex items-center gap-1.5 text-xs flex-wrap min-w-0">
      <Crumb
        active={step === 'note'}
        done={!!note}
        label={note ? `Nota: ${note}` : 'Nota'}
        onClick={() => setStep('note')}
      />
      <span className="text-gray-700">›</span>
      <Crumb
        active={step === 'quality'}
        done={!!quality}
        disabled={!note}
        label={quality ? `Tipo: ${quality.symbol || 'Mayor'}` : 'Tipo'}
        onClick={() => note && setStep('quality')}
      />
      <span className="text-gray-700">›</span>
      <Crumb
        active={step === 'voicings'}
        done={false}
        disabled={!quality}
        label={mode === 'piano' ? 'Inversiones' : 'Formas'}
        onClick={() => quality && setStep('voicings')}
      />
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-gray-800 flex-shrink-0">
          {step !== 'note' && (
            <button
              onClick={() => setStep(step === 'voicings' ? 'quality' : 'note')}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              title="Volver"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="font-black text-amber-400 text-sm sm:text-base flex-shrink-0">
            {mode === 'piano' ? '🎹' : '🎸'} Acordes
          </span>
          <div className="h-5 w-px bg-gray-700 hidden sm:block" />
          <div className="flex-1 min-w-0 overflow-x-auto">{headerCrumb}</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-xl leading-none flex-shrink-0">✕</button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* STEP 1 — note wheel */}
          {step === 'note' && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-gray-400 text-center">
                Elegí la <span className="text-teal-300 font-semibold">fundamental</span> del acorde
              </p>
              <div className="w-full flex justify-center aspect-square max-w-[380px]">
                <Wheel
                  items={noteItems}
                  onSelect={i => { setNote(CHROMATIC_NOTES[i]); setStep('quality') }}
                  onHover={setHoverNote}
                  centerTop={hoverNote !== null ? CHROMATIC_NOTES[hoverNote] : '♪'}
                  centerBottom={hoverNote !== null ? 'tocá para elegir' : 'elegí una nota'}
                  centerColor="#5eead4"
                />
              </div>
            </div>
          )}

          {/* STEP 2 — quality wheel */}
          {step === 'quality' && note && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-gray-400 text-center">
                Tipo de acorde para <span className="text-amber-300 font-bold">{note}</span>
              </p>
              <div className="w-full flex justify-center aspect-square max-w-[380px]">
                <Wheel
                  items={qualItems}
                  onSelect={i => { setQuality(CHORD_QUALITIES[i]); setStep('voicings') }}
                  onHover={setHoverQual}
                  centerTop={note}
                  centerBottom={hoverQual !== null ? CHORD_QUALITIES[hoverQual].name : 'elegí el tipo'}
                  centerColor="#fcd34d"
                />
              </div>
              {/* Fixed-height preview keeps the modal from jumping on hover */}
              <div className="h-10 flex items-center justify-center text-center max-w-md px-2">
                {hoverQual !== null ? (
                  <p>
                    <span className="text-sm font-bold" style={{ color: CATEGORY_COLOR[CHORD_QUALITIES[hoverQual].category].text }}>
                      {chordName(note, CHORD_QUALITIES[hoverQual])}
                    </span>
                    <span className="text-gray-500 text-xs"> — {CHORD_QUALITIES[hoverQual].desc}</span>
                  </p>
                ) : (
                  <span className="text-xs text-gray-600">Pasá el mouse sobre un tipo para ver el acorde</span>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — voicings */}
          {step === 'voicings' && note && quality && (
            mode === 'piano'
              ? <PianoVoicingsView note={note} quality={quality} />
              : <VoicingsView note={note} quality={quality} tuning={tuning} voicings={voicings} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Breadcrumb chip
// ─────────────────────────────────────────────────────────────────────────────

function Crumb({
  label, active, done, disabled, onClick,
}: {
  label: string; active: boolean; done?: boolean; disabled?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
        active
          ? 'bg-amber-900/50 text-amber-300'
          : disabled
            ? 'text-gray-700 cursor-default'
            : done
              ? 'text-teal-300 hover:bg-gray-800'
              : 'text-gray-500 hover:bg-gray-800'
      }`}
    >
      {label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Voicings view
// ─────────────────────────────────────────────────────────────────────────────

function VoicingsView({
  note, quality, tuning, voicings,
}: {
  note: NoteName
  quality: ChordQuality
  tuning: NoteName[]
  voicings: ReturnType<typeof generateChordVoicings>
}) {
  const notes = getChordNotes(note, quality)
  const cat = CATEGORY_COLOR[quality.category]

  return (
    <div className="space-y-5">
      {/* Chord summary */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <h2 className="text-3xl font-black leading-none" style={{ color: cat.text }}>
            {chordName(note, quality)}
          </h2>
          <p className="text-xs text-gray-500 mt-1">{quality.name} · {quality.desc}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {notes.map((nn, i) => (
            <span key={`${nn}-${i}`}
              className={`flex flex-col items-center px-2.5 py-1 rounded-md border ${
                i === 0
                  ? 'bg-amber-900/40 text-amber-300 border-amber-700/50'
                  : 'bg-gray-800 text-gray-300 border-gray-700/50'
              }`}>
              <span className="text-xs font-bold">{nn}</span>
              <span className="text-[9px] opacity-70 whitespace-nowrap">
                {intervalLabel(quality.intervals[i])}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: '#f59e0b' }} /> Fundamental
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: '#14b8a6' }} /> Nota del acorde
        </span>
        <span className="flex items-center gap-1.5"><span className="text-gray-400">✕</span> No tocar</span>
        <span className="flex items-center gap-1.5"><span className="text-gray-400">○</span> Al aire</span>
      </div>

      {/* Diagrams */}
      {voicings.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-sm">
          No se encontraron posiciones tocables para este acorde en la afinación actual.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {voicings.map((v, i) => (
            <div key={i}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-800/40 border border-gray-700/50 hover:border-teal-700/60 hover:bg-gray-800/70 transition-colors">
              <ChordDiagram voicing={v} tuning={tuning} root={note} />
              <span className="text-[11px] font-semibold text-gray-400 text-center">
                {positionLabel(v)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista de piano — fundamental e inversiones sobre el teclado
// ─────────────────────────────────────────────────────────────────────────────

const INVERSION_LABEL = ['Estado fundamental', '1ª inversión', '2ª inversión', '3ª inversión', '4ª inversión']

function PianoVoicingsView({ note, quality }: { note: NoteName; quality: ChordQuality }) {
  const notes = getChordNotes(note, quality)
  const cat   = CATEGORY_COLOR[quality.category]
  const rootPc = CHROMATIC_NOTES.indexOf(note)

  // Estado fundamental: cada intervalo por encima de la fundamental.
  // Inversión k: las k notas más graves suben una octava.
  const base = quality.intervals.map(iv => rootPc + iv)
  const inversions = base.map((_, k) =>
    base.map((p, i) => (i < k ? p + 12 : p))
  )
  const maxPos  = Math.max(...inversions[inversions.length - 1])
  const octaves = Math.max(2, Math.floor(maxPos / 12) + 1)

  return (
    <div className="space-y-5">
      {/* Resumen del acorde */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <h2 className="text-3xl font-black leading-none" style={{ color: cat.text }}>
            {chordName(note, quality)}
          </h2>
          <p className="text-xs text-gray-500 mt-1">{quality.name} · {quality.desc}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {notes.map((nn, i) => (
            <span key={`${nn}-${i}`}
              className={`flex flex-col items-center px-2.5 py-1 rounded-md border ${
                i === 0
                  ? 'bg-blue-900/40 text-blue-300 border-blue-700/50'
                  : 'bg-gray-800 text-gray-300 border-gray-700/50'
              }`}>
              <span className="text-xs font-bold">{nn}</span>
              <span className="text-[9px] opacity-70 whitespace-nowrap">
                {intervalLabel(quality.intervals[i])}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: '#3b82f6' }} /> Fundamental
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: '#14b8a6' }} /> Nota del acorde
        </span>
        <span className="ml-auto hidden sm:inline">La nota más grave define la inversión</span>
      </div>

      {/* Teclados */}
      <div className="space-y-4">
        {inversions.map((positions, k) => {
          const bassPos = Math.min(...positions)
          return (
            <div key={k}
              className="p-3 rounded-xl bg-gray-800/40 border border-gray-700/50 hover:border-teal-700/60 transition-colors">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xs font-bold text-gray-300">{INVERSION_LABEL[k] ?? `Inversión ${k}`}</span>
                <span className="text-[11px] text-gray-500">
                  bajo: {CHROMATIC_NOTES[bassPos % 12]}
                  {k > 0 && ` · ${chordName(note, quality)}/${CHROMATIC_NOTES[bassPos % 12]}`}
                </span>
              </div>
              <div className="overflow-x-auto">
                <PianoChordDiagram
                  positions={positions}
                  rootPosition={positions[0]}
                  octaves={octaves}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
