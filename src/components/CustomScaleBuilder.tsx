import { useState } from 'react'
import { ALL_INTERVALS } from '../data/notes'
import type { IntervalName, Scale } from '../types'

interface CustomScaleBuilderProps {
  onSave: (scale: Scale) => void
}

export default function CustomScaleBuilder({ onSave }: CustomScaleBuilderProps) {
  const [selectedIntervals, setSelectedIntervals] = useState<IntervalName[]>(['1'])
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function toggleInterval(interval: IntervalName) {
    if (interval === '1') return // root always selected
    setSelectedIntervals(prev =>
      prev.includes(interval)
        ? prev.filter(i => i !== interval)
        : [...prev, interval],
    )
    setError('')
  }

  // Keep intervals in chromatic order for display
  const orderedSelected = ALL_INTERVALS.filter(i => selectedIntervals.includes(i))

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Scale name is required.')
      return
    }
    if (selectedIntervals.length < 3) {
      setError('Select at least 3 intervals (including root).')
      return
    }

    const scale: Scale = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      category: 'custom',
      intervals: orderedSelected,
      isCustom: true,
    }
    onSave(scale)
    // Reset form
    setName('')
    setSelectedIntervals(['1'])
    setError('')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 px-1">
        Build Custom Scale
      </h2>

      {/* Interval toggle grid */}
      <div className="grid grid-cols-6 gap-1">
        {ALL_INTERVALS.map(interval => {
          const isRoot = interval === '1'
          const isSelected = selectedIntervals.includes(interval)
          return (
            <button
              key={interval}
              onClick={() => toggleInterval(interval)}
              disabled={isRoot}
              title={isRoot ? 'Root — always included' : undefined}
              className={`py-1.5 rounded text-xs font-semibold transition-colors focus:outline-none
                ${isRoot
                  ? 'bg-amber-400 text-amber-950 cursor-not-allowed'
                  : isSelected
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                }`}
            >
              {interval}
            </button>
          )
        })}
      </div>

      {/* Mini preview of selected intervals */}
      <div className="flex flex-wrap gap-1 min-h-[28px] px-1">
        {orderedSelected.map(i => (
          <span
            key={i}
            className={`px-1.5 py-0.5 rounded text-xs font-bold
              ${i === '1' ? 'bg-amber-400 text-amber-950' : 'bg-teal-700 text-teal-100'}`}
          >
            {i}
          </span>
        ))}
      </div>

      {/* Name input */}
      <div className="space-y-1">
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Scale name…"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-600 transition-colors"
        />
        {error && (
          <p className="text-xs text-red-400 px-1">{error}</p>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className="w-full py-2 rounded bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-colors focus:outline-none"
      >
        Save Scale
      </button>
    </div>
  )
}
