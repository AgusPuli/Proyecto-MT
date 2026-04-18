import type { FingeringPreset, IntervalForFingering } from '../types'

// Built-in fingering presets — map interval to finger number (0 = no finger)
export const BUILT_IN_FINGERINGS: FingeringPreset[] = [
  {
    id: 'standard',
    name: 'Estándar',
    fingerMap: {
      '1':  0,  // root = open string
      'b2': 0,
      '2':  0,  // (falls back to fret-based)
      'b3': 1, // minor 3rd = index
      '3':  2, // major 3rd = middle
      '4':  0,  // (falls back to fret-based)
      '5':  3, // perfect 5th = ring
      'b6': 0,
      '6':  0,  // (falls back to fret-based)
      'b7': 4, // minor 7th = pinky
      '7':  4, // major 7th = pinky
    },
  },
  {
    id: 'alternative',
    name: 'Alternativa',
    fingerMap: {
      '1':  1,
      'b2': 0,
      '2':  0,
      'b3': 2,
      '3':  3,
      '4':  0,
      '5':  4,
      'b6': 0,
      '6':  0,
      'b7': 4,
      '7':  1,
    },
  },
]

export const DEFAULT_FINGERING = BUILT_IN_FINGERINGS[0]

export const ALL_FINGERING_INTERVALS: IntervalForFingering[] = [
  '1', 'b2', '2', 'b3', '3', '4', '5', 'b6', '6', 'b7', '7',
]

/**
 * Get finger for a specific interval from a preset.
 * Returns 0 (no finger) if interval is not in the preset or not a "key" interval.
 */
export function getFingerForInterval(
  preset: FingeringPreset,
  interval: string,
): number {
  if (interval in preset.fingerMap) {
    return preset.fingerMap[interval as IntervalForFingering]
  }
  return 0
}
