import { useState } from 'react'
import type { FingeringPreset, IntervalForFingering } from '../types'
import { ALL_FINGERING_INTERVALS } from '../data/fingerings'

interface FingeringPresetSelectorProps {
  presets: FingeringPreset[]
  activePresetId: string
  onSelect: (preset: FingeringPreset) => void
  onSave: (preset: FingeringPreset) => void
  onDelete: (id: string) => void
}

const DEFAULT_FINGER_MAP: Record<IntervalForFingering, number> = {
  '1': 0, 'b2': 0, '2': 0, 'b3': 0, '3': 0, '4': 0, '5': 0, 'b6': 0, '6': 0, 'b7': 0, '7': 0,
}

export default function FingeringPresetSelector({
  presets,
  activePresetId,
  onSelect,
  onSave,
  onDelete,
}: FingeringPresetSelectorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editFingers, setEditFingers] = useState<Record<IntervalForFingering, number>>({ ...DEFAULT_FINGER_MAP })
  const [creating, setCreating] = useState(false)

  function startEdit(preset: FingeringPreset) {
    setEditingId(preset.id)
    setEditName(preset.name)
    setEditFingers({ ...preset.fingerMap })
    setCreating(false)
  }

  function startCreate() {
    setEditingId(`custom-${Date.now()}`)
    setEditName('')
    setEditFingers({ ...DEFAULT_FINGER_MAP })
    setCreating(true)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditFingers({ ...DEFAULT_FINGER_MAP })
    setCreating(false)
  }

  function saveEdit() {
    if (!editName.trim() || !editingId) return
    const updated: FingeringPreset = {
      id: editingId,
      name: editName.trim(),
      fingerMap: editFingers,
      isCustom: true,
    }
    onSave(updated)
    if (creating) onSelect(updated)
    cancelEdit()
  }

  if (editingId) {
    return (
      <div className="space-y-3 p-3 bg-gray-800 rounded border border-gray-700">
        <h3 className="text-sm font-bold text-gray-300">Edit Fingering</h3>

        {/* Name input */}
        <input
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          placeholder="Preset name"
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-teal-600"
        />

        {/* Finger mappings */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {ALL_FINGERING_INTERVALS.map(interval => (
            <div key={interval} className="flex items-center justify-between text-xs">
              <label className="text-gray-400 w-12">{interval}</label>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(finger => (
                  <button
                    key={finger}
                    onClick={() => setEditFingers(prev => ({ ...prev, [interval]: finger }))}
                    className={`w-6 h-6 rounded text-xs font-bold transition-colors
                      ${editFingers[interval] === finger
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                  >
                    {finger === 0 ? '—' : finger}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={saveEdit}
            className="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-1 rounded transition-colors"
          >
            Save
          </button>
          <button
            onClick={cancelEdit}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold py-1 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-gray-500">Fingering</h3>
        <button
          onClick={startCreate}
          className="text-xs text-gray-600 hover:text-teal-400 transition-colors font-bold"
          title="Create new preset"
        >
          +
        </button>
      </div>
      <div className="space-y-1">
        {presets.map(preset => (
          <div
            key={preset.id}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors
              ${activePresetId === preset.id
                ? 'bg-teal-900/50 border border-teal-700/50'
                : 'bg-gray-800 border border-transparent hover:bg-gray-700'
              }`}
          >
            <button
              onClick={() => onSelect(preset)}
              className="flex-1 text-left text-gray-300 focus:outline-none"
            >
              {preset.name}
            </button>
            {preset.isCustom && (
              <button
                onClick={() => onDelete(preset.id)}
                className="text-gray-600 hover:text-red-400 transition-colors text-xs"
                title="Delete"
              >
                ✕
              </button>
            )}
            <button
              onClick={() => startEdit(preset)}
              className="text-gray-600 hover:text-teal-400 transition-colors text-xs"
              title="Edit"
            >
              ✎
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
