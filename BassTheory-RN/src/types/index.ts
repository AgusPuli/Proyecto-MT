export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'

export type IntervalName = '1' | 'b2' | '2' | 'b3' | '3' | '4' | '#4' | '5' | 'b6' | '6' | 'b7' | '7'

export type LabelMode = 'note' | 'solfege' | 'interval' | 'finger' | 'degree'

export type ChordFilter = 'all' | 'triads' | 'sevenths'

export type IntervalForFingering = '1' | 'b2' | '2' | 'b3' | '3' | '4' | '5' | 'b6' | '6' | 'b7' | '7'

export interface FingeringPreset {
  id: string
  name: string
  fingerMap: Record<IntervalForFingering, number>
  isCustom?: boolean
}

export type ScaleCategory = 'major' | 'minor' | 'modes' | 'pentatonic' | 'blues' | 'arpeggio' | 'custom'

export interface Scale {
  id: string
  name: string
  category: ScaleCategory
  intervals: IntervalName[]
  isCustom?: boolean
}

export interface FretNote {
  string: number
  fret: number
  note: NoteName
  interval: IntervalName
  degree: string
  finger: number
  isRoot: boolean
}
