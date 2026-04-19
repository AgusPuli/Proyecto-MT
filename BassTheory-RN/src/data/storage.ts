import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Scale } from '../types'

const STORAGE_KEY = 'basstheory_custom_scales_v1'

export async function getCustomScales(): Promise<Scale[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Scale[]
  } catch {
    return []
  }
}

export async function saveCustomScale(scale: Scale): Promise<void> {
  const scales = await getCustomScales()
  const idx = scales.findIndex(s => s.id === scale.id)
  if (idx >= 0) {
    scales[idx] = scale
  } else {
    scales.push(scale)
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scales))
}

export async function deleteCustomScale(id: string): Promise<void> {
  const scales = (await getCustomScales()).filter(s => s.id !== id)
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scales))
}
