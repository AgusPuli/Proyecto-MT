import { useMemo, useState } from 'react'
import { NOTE_TO_SOLFEGE } from '../data/notes'
import type { FretNote, LabelMode, NoteName } from '../types'

interface PianoProps {
  notes: FretNote[]
  labelMode: LabelMode
  onNoteClick: (note: NoteName) => void
}

// Piano layout: C1 to C8 (7 octaves + C8) = 85 keys
const OCTAVE_START = 1
const OCTAVE_END = 8

const NOTE_SEQUENCE: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const WHITE_NOTES = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B'])

interface KeyData {
  note: NoteName
  octave: number
  isWhite: boolean
  label: string
}

function getAllPianoKeys(): KeyData[] {
  const keys: KeyData[] = []
  for (let oct = OCTAVE_START; oct <= OCTAVE_END; oct++) {
    for (let i = 0; i < (oct === OCTAVE_END ? 1 : 12); i++) {
      const note = NOTE_SEQUENCE[i]
      keys.push({
        note,
        octave: oct,
        isWhite: WHITE_NOTES.has(note),
        label: `${note}${oct}`,
      })
    }
  }
  return keys
}

export default function Piano({ notes, labelMode, onNoteClick }: PianoProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  // Map note → data for quick lookup
  const noteSet = useMemo(() => {
    const set = new Map<string, FretNote[]>()
    notes.forEach(n => {
      const key = n.note
      if (!set.has(key)) set.set(key, [])
      set.get(key)!.push(n)
    })
    return set
  }, [notes])

  const pianoKeys = useMemo(() => getAllPianoKeys(), [])

  // Separate white and black keys for visual layout
  const whiteKeys = pianoKeys.filter(k => k.isWhite)
  const blackKeys = pianoKeys.filter(k => !k.isWhite)

  function getLabel(note: NoteName): string {
    if (labelMode === 'solfege') return NOTE_TO_SOLFEGE[note]
    return note
  }

  function handleKeyClick(key: KeyData) {
    onNoteClick(key.note)
  }

  const selectedNotes = new Set(noteSet.keys())

  return (
    <div className="select-none flex flex-col gap-4">
      {/* ── Piano Visualization ──────────────────────────────────────────── */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
        <div className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-4">Piano — {whiteKeys.length} teclas blancas</div>

        {/* White keys grid */}
        <div
          className="relative bg-gradient-to-b from-white to-gray-50 rounded-lg border-4 border-gray-400 shadow-inner"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${whiteKeys.length}, 1fr)`,
            gap: '2px',
            padding: '8px',
            aspectRatio: `${whiteKeys.length} / 2`,
            minHeight: '180px',
          }}>
          {/* White keys */}
          {whiteKeys.map((key) => {
            const hasNote = selectedNotes.has(key.note)
            const isHovered = hoveredKey === key.label
            return (
              <button
                key={key.label}
                onClick={() => handleKeyClick(key)}
                onMouseEnter={() => setHoveredKey(key.label)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`
                  relative rounded-b-lg border-2 border-gray-600 shadow-md
                  transition-all duration-75 cursor-pointer
                  ${hasNote
                    ? 'bg-amber-300 hover:bg-amber-200 border-amber-600'
                    : 'bg-white hover:bg-gray-100 border-gray-400'}
                  ${isHovered ? 'ring-2 ring-teal-400 ring-offset-1' : ''}
                `}
                style={{
                  height: '100%',
                  transform: isHovered ? 'translateY(2px)' : 'translateY(0)',
                }}>
                <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold ${
                  hasNote ? 'text-amber-900' : 'text-gray-600'
                }`}>
                  {getLabel(key.note)}
                </span>
              </button>
            )
          })}

          {/* Black keys overlay */}
          {blackKeys.map((key) => {
            const hasNote = selectedNotes.has(key.note)
            const isHovered = hoveredKey === key.label
            const octaveOffset = (key.octave - OCTAVE_START) * 7

            // Position based on adjacent white keys
            const positionMap: Record<NoteName, number> = {
              'C#': 0.5, 'D#': 1.5, 'F#': 3.5, 'G#': 4.5, 'A#': 5.5,
              'C': 0, 'D': 0, 'E': 0, 'F': 0, 'G': 0, 'A': 0, 'B': 0,
            }
            const gridCol = octaveOffset + positionMap[key.note] + 1

            return (
              <button
                key={key.label}
                onClick={() => handleKeyClick(key)}
                onMouseEnter={() => setHoveredKey(key.label)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`
                  absolute rounded-b-lg border-2 shadow-lg
                  transition-all duration-75 cursor-pointer
                  ${hasNote
                    ? 'bg-teal-500 hover:bg-teal-400 border-teal-700'
                    : 'bg-gray-900 hover:bg-gray-800 border-gray-900'}
                  ${isHovered ? 'ring-2 ring-teal-300 ring-offset-1' : ''}
                `}
                style={{
                  width: '60%',
                  height: '65%',
                  left: `calc((${gridCol - 0.5}) * (100% / ${whiteKeys.length}))`,
                  top: '8px',
                  transform: isHovered ? 'translateY(2px)' : 'translateY(0)',
                  zIndex: 10,
                }}>
                <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold ${
                  hasNote ? 'text-teal-100' : 'text-gray-500'
                }`}>
                  {getLabel(key.note)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-300 border border-amber-600" />
            <span className="text-gray-400">En la escala</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 rounded bg-white border border-gray-400" />
            <span className="text-gray-400">Tecla blanca</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded bg-gray-900 border border-gray-900" />
            <span className="text-gray-400">Tecla negra</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <p className="text-xs text-gray-600 px-1">
        Clickea cualquier tecla para cambiar la nota raíz. Las teclas coloreadas están en la escala seleccionada.
      </p>
    </div>
  )
}
