import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CHROMATIC_NOTES } from '../data/notes'
import { CHORD_QUALITIES, CATEGORY_COLOR, chordName, getChordNotes, intervalLabel, type ChordQuality } from '../data/chords'
import Wheel, { type WheelItem } from './ChordWheel'
import type { NoteName } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// ChordPickerModal — pick a chord with the radial wheel (note → quality).
// Used by the song editor so chords can be chosen without typing.
// ─────────────────────────────────────────────────────────────────────────────

interface ChordPickerModalProps {
  visible: boolean
  onPick: (name: string) => void
  onClose: () => void
}

export default function ChordPickerModal({ visible, onPick, onClose }: ChordPickerModalProps) {
  const [note, setNote] = useState<NoteName | null>(null)
  const [hoverNote, setHoverNote] = useState<number | null>(null)
  const [hoverQual, setHoverQual] = useState<number | null>(null)

  // Reset whenever (re)opened
  useEffect(() => {
    if (visible) {
      setNote(null)
      setHoverNote(null)
      setHoverQual(null)
    }
  }, [visible])

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, onClose])

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

  function pickQuality(q: ChordQuality) {
    if (!note) return
    onPick(chordName(note, q))
    onClose()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
              {note && (
                <button
                  onClick={() => setNote(null)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                  title="Volver">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <span className="font-black text-amber-400 text-sm">🎡 Elegir acorde</span>
              <div className="flex-1" />
              <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-xl leading-none">✕</button>
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col items-center gap-3 overflow-hidden">
              <AnimatePresence mode="wait">
                {!note ? (
                  <motion.div key="note-step" className="flex flex-col items-center gap-3 w-full"
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}>
                    <p className="text-sm text-gray-400 text-center">
                      Elegí la <span className="text-teal-300 font-semibold">fundamental</span>
                    </p>
                    <div className="w-full flex justify-center aspect-square max-w-[340px]">
                      <Wheel
                        items={noteItems}
                        onSelect={i => setNote(CHROMATIC_NOTES[i])}
                        onHover={setHoverNote}
                        centerTop={hoverNote !== null ? CHROMATIC_NOTES[hoverNote] : '♪'}
                        centerBottom={hoverNote !== null ? 'tocá para elegir' : 'elegí una nota'}
                        centerColor="#5eead4"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="quality-step" className="flex flex-col items-center gap-3 w-full"
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2 }}>
                    <p className="text-sm text-gray-400 text-center">
                      Tipo de acorde para <span className="text-amber-300 font-bold">{note}</span>
                    </p>
                    <div className="w-full flex justify-center aspect-square max-w-[340px]">
                      <Wheel
                        items={qualItems}
                        onSelect={i => pickQuality(CHORD_QUALITIES[i])}
                        onHover={setHoverQual}
                        centerTop={hoverQual !== null ? chordName(note, CHORD_QUALITIES[hoverQual]) : note}
                        centerBottom={hoverQual !== null ? CHORD_QUALITIES[hoverQual].name : 'elegí el tipo'}
                        centerColor="#fcd34d"
                      />
                    </div>
                    <div className="min-h-[3.5rem] flex flex-col items-center justify-center text-center px-2 gap-1.5">
                      {hoverQual !== null ? (<>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {getChordNotes(note, CHORD_QUALITIES[hoverQual]).map((nn, i) => (
                            <span key={`${nn}-${i}`}
                              className={`flex flex-col items-center px-2 py-0.5 rounded-md border ${
                                i === 0
                                  ? 'bg-amber-900/40 text-amber-300 border-amber-700/50'
                                  : 'bg-gray-800 text-gray-300 border-gray-700/50'
                              }`}>
                              <span className="text-xs font-bold">{nn}</span>
                              <span className="text-[9px] opacity-70 whitespace-nowrap">
                                {intervalLabel(CHORD_QUALITIES[hoverQual].intervals[i])}
                              </span>
                            </span>
                          ))}
                        </div>
                        <span className="text-[11px] text-gray-500">{CHORD_QUALITIES[hoverQual].desc}</span>
                      </>) : (
                        <span className="text-xs text-gray-600">Tocá un tipo para insertar el acorde</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
