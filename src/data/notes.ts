import type { NoteName, IntervalName, Scale, FretNote, ChordFilter, FingeringPreset } from '../types'
import { getFingerForInterval } from './fingerings'

// All 12 chromatic notes in ascending order
export const CHROMATIC_NOTES: NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
]

// Fixed-do solfège names (Spanish / Latin convention)
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

// Standard 4-string bass tuning (low to high)
// index 0 = low E (displayed as string 3), index 3 = G (displayed as string 0)
// TODO: Add alternate tunings (drop-D, 5-string, etc.) by swapping this array
export const STANDARD_TUNING: NoteName[] = ['E', 'A', 'D', 'G']

// Interval names in semitone order (index = semitones from root)
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

/** Returns the note name at a given fret on a string with the specified open note. */
export function getNoteAtFret(openNote: NoteName, fret: number): NoteName {
  const idx = CHROMATIC_NOTES.indexOf(openNote)
  return CHROMATIC_NOTES[(idx + fret) % 12]
}

/** Returns the interval name between a root note and another note. */
export function getIntervalFromRoot(root: NoteName, note: NoteName): IntervalName {
  const rootIdx = CHROMATIC_NOTES.indexOf(root)
  const noteIdx = CHROMATIC_NOTES.indexOf(note)
  const semitones = (noteIdx - rootIdx + 12) % 12
  return ALL_INTERVALS[semitones]
}

/** Returns the Roman numeral degree string for an interval. */
export function getDegreeFromInterval(interval: IntervalName): string {
  return DEGREE_MAP[interval]
}

/** Checks if an interval matches the chord filter. */
export function matchesChordFilter(interval: IntervalName, filter: ChordFilter): boolean {
  if (filter === 'all') return true

  // Triads: root (1), third (b3, 3), fifth (b5/#4, 5)
  const triadIntervals: Set<IntervalName> = new Set(['1', 'b3', '3', '#4', '5'])

  // Sevenths: triads + sevenths (b7, 7)
  const seventhIntervals: Set<IntervalName> = new Set([...triadIntervals, 'b7', '7'])

  switch (filter) {
    case 'triads':   return triadIntervals.has(interval)
    case 'sevenths': return seventhIntervals.has(interval)
    default:         return true
  }
}

/**
 * Computes all fretboard positions that belong to the given scale.
 * Optionally filters by chord type (triads, sevenths).
 * Uses fingering preset to determine finger for each interval.
 * Pure function — safe to memoize.
 *
 * TODO: Support guitar/ukulele/5-string by passing a custom tuning array.
 */
export function computeFretboard(
  root: NoteName,
  scale: Scale,
  frets: number,
  chordFilter: ChordFilter = 'all',
  fingeringPreset?: FingeringPreset,
): FretNote[] {
  const notes: FretNote[] = []

  for (let tuningIdx = 0; tuningIdx < STANDARD_TUNING.length; tuningIdx++) {
    // Map from tuning index to display string number:
    // tuningIdx 0 (low E) → string 3 (bottom of display)
    // tuningIdx 3 (G)     → string 0 (top of display)
    const stringNum = (STANDARD_TUNING.length - 1) - tuningIdx
    const openNote = STANDARD_TUNING[tuningIdx]

    for (let fret = 0; fret <= frets; fret++) {
      const note = getNoteAtFret(openNote, fret)
      const interval = getIntervalFromRoot(root, note)

      if (scale.intervals.includes(interval) && matchesChordFilter(interval, chordFilter)) {
        // Open strings (fret 0) always use finger 0, regardless of preset
        let finger: number
        if (fret === 0) {
          finger = 0
        } else if (fingeringPreset) {
          const presetFinger = getFingerForInterval(fingeringPreset, interval)
          // Use preset finger only if it's defined (non-zero or explicitly mapped)
          if (presetFinger !== 0) {
            finger = presetFinger
          } else if (interval in fingeringPreset.fingerMap) {
            // Interval is in preset but mapped to 0 (no finger) — keep as 0
            finger = 0
          } else {
            // Interval not in preset — fall back to fret-based calculation
            finger = ((fret - 1) % 4) + 1
          }
        } else {
          // No preset — use fret-based calculation
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
