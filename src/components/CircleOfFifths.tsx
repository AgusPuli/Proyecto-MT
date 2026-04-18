import { useState } from 'react'
import { CHROMATIC_NOTES } from '../data/notes'
import { BUILT_IN_SCALES } from '../data/scales'
import type { NoteName, Scale } from '../types'

interface CircleOfFifthsProps {
  root: NoteName
  selectedScale: Scale
  onRootChange: (note: NoteName) => void
  onScaleChange: (scale: Scale) => void
  synchronized: boolean
  onSyncChange: (sync: boolean) => void
}

const RELATIVE_MINORS: Record<NoteName, NoteName> = {
  'C': 'A', 'G': 'E', 'D': 'B', 'A': 'F#', 'E': 'C#', 'B': 'G#',
  'F#': 'D#', 'C#': 'A#', 'G#': 'F#', 'D#': 'B',
  'A#': 'G#', 'F': 'D',
}

export default function CircleOfFifths({
  root,
  selectedScale,
  onRootChange,
  onScaleChange,
  synchronized,
  onSyncChange,
}: CircleOfFifthsProps) {
  const [hoveredNote, setHoveredNote] = useState<NoteName | null>(null)
  const majorScale = BUILT_IN_SCALES.find(s => s.id === 'major')!
  const minorScale = BUILT_IN_SCALES.find(s => s.id === 'natural-minor')!

  const isMajor = selectedScale.id === 'major'
  const isMinor = selectedScale.id === 'natural-minor'

  function handleNoteClick(note: NoteName, isMajor: boolean) {
    if (synchronized) {
      onRootChange(note)
      onScaleChange(isMajor ? majorScale : minorScale)
    } else {
      onRootChange(note)
    }
  }

  function handleSyncClick() {
    const newSync = !synchronized
    onSyncChange(newSync)
    // Adapt circle to fretboard (set scale based on root)
    if (newSync && isMinor) {
      onScaleChange(minorScale)
    } else if (newSync && !isMajor && !isMinor) {
      onScaleChange(majorScale)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-900 rounded border border-gray-800">
      <div className="flex items-center justify-between w-full">
        <h3 className="text-sm font-semibold uppercase text-gray-500">Circle of Fifths</h3>
        <button
          onClick={handleSyncClick}
          className={`px-2 py-1 text-xs font-bold rounded transition-colors
            ${synchronized
              ? 'bg-teal-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
        >
          {synchronized ? '🔗 Sync' : 'Sync'}
        </button>
      </div>

      {/* Circle visualization */}
      <svg width="280" height="280" viewBox="0 0 280 280" className="select-none">
        {/* Outer circle (major keys) */}
        {CHROMATIC_NOTES.map((note, idx) => {
          const angle = (idx * 30 - 90) * (Math.PI / 180)
          const x = 140 + 100 * Math.cos(angle)
          const y = 140 + 100 * Math.sin(angle)
          const isActive = root === note && isMajor
          const isHovered = hoveredNote === note

          return (
            <g key={`major-${note}`}>
              {/* Circle */}
              <circle
                cx={x}
                cy={y}
                r="18"
                fill={isActive ? '#14b8a6' : isHovered ? '#0d9488' : '#1f2937'}
                stroke={isActive ? '#06b6d4' : '#4b5563'}
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={() => setHoveredNote(note)}
                onMouseLeave={() => setHoveredNote(null)}
                onClick={() => handleNoteClick(note, true)}
              />
              {/* Label */}
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-bold"
                fill={isActive ? '#030712' : '#e5e7eb'}
                style={{ pointerEvents: 'none' }}
              >
                {note}
              </text>
            </g>
          )
        })}

        {/* Inner circle (minor keys) */}
        {CHROMATIC_NOTES.map((note, idx) => {
          const angle = (idx * 30 - 90) * (Math.PI / 180)
          const x = 140 + 60 * Math.cos(angle)
          const y = 140 + 60 * Math.sin(angle)
          const minorNote = RELATIVE_MINORS[note]
          const isActive = root === minorNote && isMinor
          const isHovered = hoveredNote === minorNote

          return (
            <g key={`minor-${note}`} onMouseEnter={() => setHoveredNote(minorNote)} onMouseLeave={() => setHoveredNote(null)}>
              {/* Circle */}
              <circle
                cx={x}
                cy={y}
                r="16"
                fill={isActive ? '#f59e0b' : isHovered ? '#d97706' : '#111827'}
                stroke={isActive ? '#fbbf24' : '#4b5563'}
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => handleNoteClick(minorNote, false)}
              />
              {/* Label */}
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-bold"
                fill={isActive ? '#030712' : '#e5e7eb'}
                style={{ pointerEvents: 'none' }}
              >
                {minorNote}
              </text>
            </g>
          )
        })}

        {/* Center circle */}
        <circle cx="140" cy="140" r="20" fill="#030712" stroke="#4b5563" strokeWidth="2" />
        <text
          x="140"
          y="140"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-bold"
          fill="#9ca3af"
          style={{ pointerEvents: 'none' }}
        >
          {root}
        </text>
      </svg>

      {/* Info */}
      {hoveredNote && (
        <div className="text-xs text-gray-400 text-center space-y-1">
          <p className="font-semibold">{hoveredNote}</p>
          {hoveredNote === root && (
            <p className="text-teal-400">{isMajor ? 'Major' : 'Minor'} Tonality</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-teal-600" />
          <span>Major</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>Minor</span>
        </div>
      </div>
    </div>
  )
}
