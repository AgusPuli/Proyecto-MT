import type { NoteName } from '../types'
import { CHORD_QUALITIES, type ChordQuality } from './chords'

// ─────────────────────────────────────────────────────────────────────────────
// Chord name parser — "C#m7" → { root: 'C#', quality: m7 }
// Inverse of chordName() in chords.ts. Used by the Songs feature to analyze
// chord annotations written as free text.
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedChord {
  root: NoteName        // normalized to sharps (CHROMATIC_NOTES spelling)
  quality: ChordQuality
  input: string         // raw text as the user typed it (preserved for display)
}

// Flats (and edge enharmonics) → the sharp spelling the rest of the app uses.
const FLAT_TO_SHARP: Record<string, NoteName> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'Cb': 'B',  'Fb': 'E',  'E#': 'F',  'B#': 'C',
}

/** Normalizes a root spelling ("Bb", "F#", "D♭") to a NoteName, or null. */
export function normalizeRoot(raw: string): NoteName | null {
  const s = raw.replace('♭', 'b').replace('♯', '#')
  if (s in FLAT_TO_SHARP) return FLAT_TO_SHARP[s]
  const VALID: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  return VALID.includes(s as NoteName) ? (s as NoteName) : null
}

// Accepted suffix spellings → quality id. Includes the canonical symbols from
// CHORD_QUALITIES plus common ASCII/unicode aliases users are likely to type.
const QUALITY_ALIASES: [string, string][] = [
  // longest first — order matters, checked top to bottom after sorting
  ['m7b5', 'm7b5'], ['m7♭5', 'm7b5'], ['ø7', 'm7b5'], ['ø', 'm7b5'],
  ['dim7', 'dim7'], ['°7', 'dim7'], ['º7', 'dim7'],
  ['maj7', 'maj7'], ['Maj7', 'maj7'], ['M7', 'maj7'], ['Δ7', 'maj7'], ['Δ', 'maj7'],
  ['add9', 'add9'],
  ['sus2', 'sus2'], ['sus4', 'sus4'], ['sus', 'sus4'],
  ['dim', 'dim'], ['°', 'dim'], ['º', 'dim'],
  ['aug', 'aug'], ['+', 'aug'],
  ['min7', 'm7'], ['-7', 'm7'], ['m7', 'm7'],
  ['min', 'min'], ['-', 'min'], ['m', 'min'],
  ['9', '9'], ['7', '7'], ['6', '6'], ['5', '5'],
  ['', 'maj'],
]

// Sorted longest-alias-first so "maj7" wins over "7", "m7b5" over "m7" over "m".
const SORTED_ALIASES = [...QUALITY_ALIASES].sort((a, b) => b[0].length - a[0].length)

const QUALITY_BY_ID = new Map(CHORD_QUALITIES.map(q => [q.id, q]))

/**
 * Parses a chord token like "Am", "C#m7", "Bbmaj7" into root + quality.
 * Returns null when the text is not a chord (e.g. "Intro", "Coro 2") — the
 * song parser uses that to tell section headers apart from chords.
 */
export function parseChord(token: string): ParsedChord | null {
  const t = token.trim()
  const m = /^([A-G])([#b♭♯]?)(.*)$/.exec(t)
  if (!m) return null

  const root = normalizeRoot(m[1] + m[2])
  if (!root) return null

  const suffix = m[3]
  for (const [alias, qualityId] of SORTED_ALIASES) {
    if (suffix === alias) {
      const quality = QUALITY_BY_ID.get(qualityId)
      if (quality) return { root, quality, input: t }
    }
  }
  return null
}

/** True when the bracketed token is a chord rather than a section title. */
export function isChordToken(token: string): boolean {
  return parseChord(token) !== null
}
