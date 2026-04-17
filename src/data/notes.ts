import type { NoteName, IntervalName, Scale, FretNote } from '../types'

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

/**
 * Computes all fretboard positions that belong to the given scale.
 * Pure function — safe to memoize.
 *
 * TODO: Support guitar/ukulele/5-string by passing a custom tuning array.
 */
export function computeFretboard(
  root: NoteName,
  scale: Scale,
  frets: number,
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

      if (scale.intervals.includes(interval)) {
        notes.push({
          string: stringNum,
          fret,
          note,
          interval,
          degree: getDegreeFromInterval(interval),
          // Simple positional fingering: open = 0, frets 1-4 = fingers 1-4 cycling
          finger: fret === 0 ? 0 : ((fret - 1) % 4) + 1,
          isRoot: interval === '1',
        })
      }
    }
  }

  return notes
}
