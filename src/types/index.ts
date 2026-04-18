export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'

export type IntervalName = '1' | 'b2' | '2' | 'b3' | '3' | '4' | '#4' | '5' | 'b6' | '6' | 'b7' | '7'

export type LabelMode = 'note' | 'solfege' | 'interval' | 'finger' | 'degree'

export type ChordFilter = 'all' | 'triads' | 'sevenths'
// 'all'      → show all scale notes
// 'triads'   → only 1, b3/3, 5, b5/#4 (root + third + fifth)
// 'sevenths' → add b7, 7 to triads

export type IntervalForFingering = '1' | 'b2' | '2' | 'b3' | '3' | '4' | '5' | 'b6' | '6' | 'b7' | '7'

export interface FingeringPreset {
  id: string
  name: string
  // Maps interval → finger (0 = open/no finger, 1-4 = fingers, rest use fret-based fallback)
  fingerMap: Record<IntervalForFingering, number>
  isCustom?: boolean
}

export type FingeringMode = 'positional' | 'pattern'
// 'positional' → finger based on fret (original: fret cycles 1-4)
// 'pattern'    → finger based on preset map

export type ScaleCategory = 'major' | 'minor' | 'modes' | 'pentatonic' | 'blues' | 'arpeggio' | 'custom'

export interface Scale {
  id: string
  name: string
  category: ScaleCategory
  intervals: IntervalName[]  // e.g. ['1', '2', 'b3', '4', '5', 'b6', 'b7']
  isCustom?: boolean
}

export interface FretNote {
  string: number      // 0-3 (0 = G, 3 = E)
  fret: number        // 0-23
  note: NoteName
  interval: IntervalName
  degree: string      // 'I', 'II', etc.
  finger: number      // 1-4 suggested fingering (0 = open string)
  isRoot: boolean
}
