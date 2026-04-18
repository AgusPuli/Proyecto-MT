import type { ChordFilter } from '../types'

interface ChordFilterDropdownProps {
  value: ChordFilter
  onChange: (filter: ChordFilter) => void
}

const FILTERS: { key: ChordFilter; label: string; description: string }[] = [
  { key: 'all',      label: 'All Notes',  description: 'Show all scale notes' },
  { key: 'triads',   label: 'Triads',     description: 'Root, 3rd, 5th only' },
  { key: 'sevenths', label: 'Sevenths',   description: 'Triads + 7th' },
]

export default function ChordFilterDropdown({ value, onChange }: ChordFilterDropdownProps) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={e => onChange(e.target.value as ChordFilter)}
        className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-700 focus:outline-none focus:border-teal-600 transition-colors appearance-none cursor-pointer pr-8"
        title="Filter by chord type"
      >
        {FILTERS.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      {/* Dropdown arrow */}
      <svg
        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}
