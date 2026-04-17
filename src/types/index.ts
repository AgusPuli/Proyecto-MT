export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'

export type IntervalName = '1' | 'b2' | '2' | 'b3' | '3' | '4' | '#4' | '5' | 'b6' | '6' | 'b7' | '7'

export type LabelMode = 'note' | 'solfege' | 'interval' | 'finger' | 'degree'

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
