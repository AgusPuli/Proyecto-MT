import { getNoteAtFret, ALL_INTERVALS } from '../data/notes'
import type { IntervalName, NoteName, Scale } from '../types'

interface Props {
  root: NoteName
  scale: Scale
}

// Human-readable quality label for each interval
const QUALITY: Partial<Record<IntervalName, string>> = {
  '1':  'justa',
  'b3': 'menor',
  '3':  'mayor',
  '#4': 'disminuida',
  '5':  'justa',
  'b7': 'menor',
  '7':  'mayor',
}

// Each chord tone maps to the possible intervals that represent it.
// Priority: first match found in the scale wins (e.g. b3 before 3).
const CHORD_TONES: { label: string; intervals: IntervalName[] }[] = [
  { label: 'Primera', intervals: ['1']        },
  { label: 'Tercera', intervals: ['b3', '3']  },
  { label: 'Quinta',  intervals: ['#4', '5']  },
  { label: 'Séptima', intervals: ['b7', '7']  },
]

export default function ScaleTones({ root, scale }: Props) {
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {CHORD_TONES.map(({ label, intervals }) => {
        const matched = intervals.find(iv => scale.intervals.includes(iv)) ?? null
        const note    = matched !== null
          ? getNoteAtFret(root, ALL_INTERVALS.indexOf(matched))
          : null
        const quality = matched ? QUALITY[matched] : null

        return (
          <div
            key={label}
            className="flex flex-col items-center gap-1 bg-gray-800/70 border border-gray-700/40
                       rounded-xl px-5 py-3 min-w-[80px]"
          >
            {/* Chord tone name */}
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
              {label}
            </span>

            {/* Note name */}
            {note !== null ? (
              <>
                <span
                  className={`text-2xl font-black leading-none tracking-tight
                    ${matched === '1' ? 'text-amber-400' : 'text-teal-400'}`}
                >
                  {note}
                </span>
                {/* Quality label — clearly readable */}
                <span className="text-xs text-gray-300 font-medium mt-0.5">
                  {quality}
                </span>
              </>
            ) : (
              <span className="text-gray-700 text-2xl leading-none">—</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
