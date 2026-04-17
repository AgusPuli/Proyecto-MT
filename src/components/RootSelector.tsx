import { CHROMATIC_NOTES } from '../data/notes'
import type { NoteName } from '../types'

interface RootSelectorProps {
  value: NoteName
  onChange: (note: NoteName) => void
}

export default function RootSelector({ value, onChange }: RootSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {CHROMATIC_NOTES.map(note => (
        <button
          key={note}
          onClick={() => onChange(note)}
          className={`w-9 h-9 rounded text-sm font-bold transition-colors focus:outline-none
            ${value === note
              ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-900/50'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
        >
          {note}
        </button>
      ))}
    </div>
  )
}
