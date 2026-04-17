import type { LabelMode } from '../types'

interface LabelToggleProps {
  value: LabelMode
  onChange: (mode: LabelMode) => void
}

const MODES: { key: LabelMode; label: string }[] = [
  { key: 'note',     label: 'Note'    },
  { key: 'solfege',  label: 'Do-Re-Mi'},
  { key: 'interval', label: 'Interval'},
  { key: 'degree',   label: 'Degree'  },
  { key: 'finger',   label: 'Finger'  },
]

export default function LabelToggle({ value, onChange }: LabelToggleProps) {
  return (
    <div className="inline-flex rounded-md overflow-hidden border border-gray-700">
      {MODES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none
            ${value === key
              ? 'bg-amber-400 text-amber-950'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
