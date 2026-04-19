import type { NoteName, IntervalName, Scale, FretNote, ChordFilter, FingeringPreset } from '../types'
import { getFingerForInterval } from './fingerings'

export const CHROMATIC_NOTES: NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
]

export const NOTE_TO_SOLFEGE: Record<NoteName, string> = {
  'C':  'Do',
  'C#': 'Do#',
  'D':  'Re',
  'D#': 'Re#',
  'E':  'Mi',
  'F':  'Fa',
  'F#': 'Fa#',
  'G':  'Sol',
  'G#': 'Sol#',
  'A':  'La',
  'A#': 'La#',
  'B':  'Si',
}

export const STANDARD_TUNING: NoteName[] = ['E', 'A', 'D', 'G']

export const ALL_INTERVALS: IntervalName[] = [
  '1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7',
]

const DEGREE_MAP: Record<IntervalName, string> = {
  '1':  'I',
  'b2': 'bII',
  '2':  'II',
  'b3': 'bIII',
  '3':  'III',
  '4':  'IV',
  '#4': '#IV',
  '5':  'V',
  'b6': 'bVI',
  '6':  'VI',
  'b7': 'bVII',
  '7':  'VII',
}

export function getNoteAtFret(openNote: NoteName, fret: number): NoteName {
  const idx = CHROMATIC_NOTES.indexOf(openNote)
  return CHROMATIC_NOTES[(idx + fret) % 12]
}

export function getIntervalFromRoot(root: NoteName, note: NoteName): IntervalName {
  const rootIdx = CHROMATIC_NOTES.indexOf(root)
  const noteIdx = CHROMATIC_NOTES.indexOf(note)
  const semitones = (noteIdx - rootIdx + 12) % 12
  return ALL_INTERVALS[semitones]
}

export function getDegreeFromInterval(interval: IntervalName): string {
  return DEGREE_MAP[interval]
}

export function matchesChordFilter(interval: IntervalName, filter: ChordFilter): boolean {
  if (filter === 'all') return true
  const triadIntervals: Set<IntervalName> = new Set(['1', 'b3', '3', '#4', '5'])
  const seventhIntervals: Set<IntervalName> = new Set([...triadIntervals, 'b7', '7'])
  switch (filter) {
    case 'triads':   return triadIntervals.has(interval)
    case 'sevenths': return seventhIntervals.has(interval)
    default:         return true
  }
}

export function computeFretboard(
  root: NoteName,
  scale: Scale,
  frets: number,
  chordFilter: ChordFilter = 'all',
  fingeringPreset?: FingeringPreset,
): FretNote[] {
  const notes: FretNote[] = []

  for (let tuningIdx = 0; tuningIdx < STANDARD_TUNING.length; tuningIdx++) {
    const stringNum = (STANDARD_TUNING.length - 1) - tuningIdx
    const openNote = STANDARD_TUNING[tuningIdx]

    for (let fret = 0; fret <= frets; fret++) {
      const note = getNoteAtFret(openNote, fret)
      const interval = getIntervalFromRoot(root, note)

      if (scale.intervals.includes(interval) && matchesChordFilter(interval, chordFilter)) {
        let finger: number
        if (fret === 0) {
          finger = 0
        } else if (fingeringPreset) {
          const presetFinger = getFingerForInterval(fingeringPreset, interval)
          if (presetFinger !== 0) {
            finger = presetFinger
          } else if (interval in fingeringPreset.fingerMap) {
            finger = 0
          } else {
            finger = ((fret - 1) % 4) + 1
          }
        } else {
          finger = ((fret - 1) % 4) + 1
        }

        notes.push({
          string: stringNum,
          fret,
          note,
          interval,
          degree: getDegreeFromInterval(interval),
          finger,
          isRoot: interval === '1',
        })
      }
    }
  }

  return notes
}
