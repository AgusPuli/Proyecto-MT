import type { FingeringPreset, IntervalForFingering } from '../types'

export const BUILT_IN_FINGERINGS: FingeringPreset[] = [
  {
    id: 'standard',
    name: 'Estándar',
    fingerMap: {
      '1': 0, 'b2': 0, '2': 0, 'b3': 1, '3': 2,
      '4': 0, '5': 3, 'b6': 0, '6': 0, 'b7': 4, '7': 4,
    },
  },
  {
    id: 'alternative',
    name: 'Alternativa',
    fingerMap: {
      '1': 1, 'b2': 0, '2': 0, 'b3': 2, '3': 3,
      '4': 0, '5': 4, 'b6': 0, '6': 0, 'b7': 4, '7': 1,
    },
  },
]

export const DEFAULT_FINGERING = BUILT_IN_FINGERINGS[0]

export const ALL_FINGERING_INTERVALS: IntervalForFingering[] = [
  '1', 'b2', '2', 'b3', '3', '4', '5', 'b6', '6', 'b7', '7',
]

export function getFingerForInterval(preset: FingeringPreset, interval: string): number {
  if (interval in preset.fingerMap) {
    return preset.fingerMap[interval as IntervalForFingering]
  }
  return 0
}
