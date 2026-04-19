import AsyncStorage from '@react-native-async-storage/async-storage'
import type { FingeringPreset } from '../types'

const STORAGE_KEY = 'basstheory_fingering_presets_v1'

export async function loadCustomFingeringPresets(): Promise<FingeringPreset[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as FingeringPreset[]
  } catch {
    return []
  }
}

export async function saveCustomFingeringPreset(preset: FingeringPreset): Promise<void> {
  const presets = await loadCustomFingeringPresets()
  const idx = presets.findIndex(p => p.id === preset.id)
  if (idx >= 0) {
    presets[idx] = preset
  } else {
    presets.push(preset)
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

export async function deleteCustomFingeringPreset(id: string): Promise<void> {
  const presets = (await loadCustomFingeringPresets()).filter(p => p.id !== id)
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}
