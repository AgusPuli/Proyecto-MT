import type { FingeringPreset } from '../types'

const STORAGE_KEY = 'basstheory_fingering_presets_v1'

export function loadCustomFingeringPresets(): FingeringPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as FingeringPreset[]
  } catch {
    return []
  }
}

export function saveCustomFingeringPreset(preset: FingeringPreset): void {
  const presets = loadCustomFingeringPresets()
  const idx = presets.findIndex(p => p.id === preset.id)
  if (idx >= 0) {
    presets[idx] = preset
  } else {
    presets.push(preset)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

export function deleteCustomFingeringPreset(id: string): void {
  const presets = loadCustomFingeringPresets().filter(p => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}
