import { useState } from 'react'
import type { Scale, ScaleCategory } from '../types'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../data/scales'

interface ScaleLibraryProps {
  scales: Scale[]
  activeScaleId: string
  onSelect: (scale: Scale) => void
  onDelete: (id: string) => void
}

export default function ScaleLibrary({
  scales,
  activeScaleId,
  onSelect,
  onDelete,
}: ScaleLibraryProps) {
  // Track which categories are expanded (all open by default)
  const [openCategories, setOpenCategories] = useState<Set<ScaleCategory>>(
    new Set(CATEGORY_ORDER),
  )

  function toggleCategory(cat: ScaleCategory) {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Group scales by category, preserving CATEGORY_ORDER
  const grouped = CATEGORY_ORDER.reduce<Record<ScaleCategory, Scale[]>>(
    (acc, cat) => {
      acc[cat] = scales.filter(s =>
        cat === 'custom' ? s.isCustom : s.category === cat && !s.isCustom,
      )
      return acc
    },
    {} as Record<ScaleCategory, Scale[]>,
  )

  return (
    <div className="space-y-1">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 px-1">
        Scale Library
      </h2>

      {CATEGORY_ORDER.map(cat => {
        const group = grouped[cat]
        if (group.length === 0) return null
        const isOpen = openCategories.has(cat)

        return (
          <div key={cat}>
            {/* Category header */}
            <button
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-800 transition-colors group"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 group-hover:text-gray-300">
                {CATEGORY_LABELS[cat]}
              </span>
              <svg
                className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Scale rows */}
            {isOpen && (
              <div className="ml-2 mt-0.5 space-y-0.5">
                {group.map(scale => {
                  const isActive = scale.id === activeScaleId
                  return (
                    <div
                      key={scale.id}
                      className={`flex items-center rounded transition-colors cursor-pointer group/row
                        ${isActive
                          ? 'bg-teal-900/50 border border-teal-700/50'
                          : 'hover:bg-gray-800 border border-transparent'
                        }`}
                    >
                      <button
                        onClick={() => onSelect(scale)}
                        className="flex-1 text-left px-2 py-1.5 text-sm focus:outline-none"
                      >
                        <span className={isActive ? 'text-teal-300 font-medium' : 'text-gray-300'}>
                          {scale.name}
                        </span>
                      </button>

                      {/* Delete button — only for custom scales */}
                      {scale.isCustom && (
                        <button
                          onClick={e => { e.stopPropagation(); onDelete(scale.id) }}
                          className="px-2 py-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover/row:opacity-100 transition-all focus:outline-none"
                          title="Delete scale"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
