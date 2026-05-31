import type { NoteName } from '../types'
import { CHROMATIC_NOTES } from './notes'

// ─────────────────────────────────────────────────────────────────────────────
// Chord qualities (types)
// Intervals are semitones from the root. Extended chords (>octave) use 14 = 9th.
// ─────────────────────────────────────────────────────────────────────────────

export type ChordCategory = 'triad' | 'power' | 'seventh' | 'sus' | 'added' | 'extended'

export interface ChordQuality {
  id: string
  name: string        // full Spanish name
  symbol: string      // suffix appended to the root (e.g. 'm7', 'maj7', '' for major)
  intervals: number[] // semitones from root
  category: ChordCategory
  desc: string        // short character description
}

export const CHORD_QUALITIES: ChordQuality[] = [
  // ── Triads ────────────────────────────────────────────────────────────────
  { id: 'maj', name: 'Mayor',       symbol: '',     intervals: [0, 4, 7],        category: 'triad', desc: 'Brillante y estable' },
  { id: 'min', name: 'Menor',       symbol: 'm',    intervals: [0, 3, 7],        category: 'triad', desc: 'Oscuro, melancólico' },
  { id: 'dim', name: 'Disminuido',  symbol: 'dim',  intervals: [0, 3, 6],        category: 'triad', desc: 'Tenso e inestable' },
  { id: 'aug', name: 'Aumentado',   symbol: 'aug',  intervals: [0, 4, 8],        category: 'triad', desc: 'Misterioso, suspendido' },

  // ── Power ───────────────────────────────────────────────────────────────--
  { id: '5',   name: 'Power',       symbol: '5',    intervals: [0, 7],           category: 'power', desc: 'Sin tercera — rock/metal' },

  // ── Sevenths ────────────────────────────────────────────────────────────--
  { id: '7',    name: 'Dominante 7', symbol: '7',    intervals: [0, 4, 7, 10],   category: 'seventh', desc: 'Tensión bluesy que resuelve' },
  { id: 'maj7', name: 'Mayor 7',     symbol: 'maj7', intervals: [0, 4, 7, 11],   category: 'seventh', desc: 'Suave, jazzy, soñador' },
  { id: 'm7',   name: 'Menor 7',     symbol: 'm7',   intervals: [0, 3, 7, 10],   category: 'seventh', desc: 'Cálido, jazz/funk' },
  { id: 'm7b5', name: 'Semidisminuido', symbol: 'm7♭5', intervals: [0, 3, 6, 10], category: 'seventh', desc: 'ii de tonalidad menor (jazz)' },
  { id: 'dim7', name: 'Disminuido 7', symbol: '°7',  intervals: [0, 3, 6, 9],    category: 'seventh', desc: 'Muy tenso, acorde de paso' },

  // ── Suspended / added / sixth ──────────────────────────────────────────────
  { id: 'sus2', name: 'Suspendido 2', symbol: 'sus2', intervals: [0, 2, 7],      category: 'sus',   desc: 'Abierto y ambiguo' },
  { id: 'sus4', name: 'Suspendido 4', symbol: 'sus4', intervals: [0, 5, 7],      category: 'sus',   desc: 'Tensión que pide resolver' },
  { id: '6',    name: 'Sexta',        symbol: '6',    intervals: [0, 4, 7, 9],   category: 'added', desc: 'Dulce, vintage' },
  { id: 'add9', name: 'Add9',         symbol: 'add9', intervals: [0, 4, 7, 14],  category: 'added', desc: 'Brillante, moderno' },
  { id: '9',    name: 'Novena',       symbol: '9',    intervals: [0, 4, 7, 10, 14], category: 'extended', desc: 'Dominante rico, funky' },
]

// Accent color per category — used by the quality wheel / cards.
export const CATEGORY_COLOR: Record<ChordCategory, { fill: string; text: string }> = {
  triad:    { fill: '#0d9488', text: '#5eead4' }, // teal
  power:    { fill: '#b45309', text: '#fcd34d' }, // amber
  seventh:  { fill: '#7c3aed', text: '#c4b5fd' }, // violet
  sus:      { fill: '#0369a1', text: '#7dd3fc' }, // sky
  added:    { fill: '#be185d', text: '#f9a8d4' }, // pink
  extended: { fill: '#c2410c', text: '#fdba74' }, // orange
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const pcOf = (n: NoteName): number => CHROMATIC_NOTES.indexOf(n)
const noteOfPc = (pc: number): NoteName => CHROMATIC_NOTES[((pc % 12) + 12) % 12]

/** Returns the note names that make up `root` + `quality`. */
export function getChordNotes(root: NoteName, quality: ChordQuality): NoteName[] {
  const r = pcOf(root)
  return quality.intervals.map(iv => noteOfPc(r + iv))
}

/** Builds the display name for a chord, e.g. C, Cm, Cmaj7, C5. */
export function chordName(root: NoteName, quality: ChordQuality): string {
  return `${root}${quality.symbol}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Voicing generation
// A voicing is one playable way to fret the chord on the current tuning.
// frets[i] / fingers[i] are indexed in tuning order (0 = lowest-pitched string).
// ─────────────────────────────────────────────────────────────────────────────

export interface Barre {
  fret: number
  fromString: number  // lowest string index in tuning order
  toString: number    // highest string index in tuning order
  finger: number
}

export interface ChordVoicing {
  frets: (number | null)[]    // null = muted, 0 = open, n = fret n
  fingers: (number | null)[]  // null = muted/open
  barres: Barre[]
  baseFret: number            // first fret shown in the diagram (1 = nut)
  minFret: number             // lowest fretted fret (>0), or 0 if all open
  maxFret: number
  fingerCount: number
}

const MAX_FINGERS = 4
const FRET_SPAN = 3 // a 4-fret window (start .. start+3)

/**
 * Computes finger numbers + barre for a fret array (tuning order indexing).
 *
 * A barre (index finger, finger 1) is only used when the lowest-fret group
 * spans ≥2 strings AND includes the bass (lowest sounding) string AND has notes
 * fretted above it — i.e. the classic E/A-shape barre. That rules out the
 * physically impossible "bass note below a mid-neck barre" voicings. Otherwise
 * each fretted string gets its own finger. Returns null if it can't be fingered
 * with ≤4 fingers.
 */
function assignFingers(frets: (number | null)[]): {
  fingers: (number | null)[]
  barres: Barre[]
  fingerCount: number
} | null {
  const fretted = frets
    .map((f, s) => ({ f: f ?? -1, s }))
    .filter(x => x.f > 0)

  const fingers: (number | null)[] = frets.map(() => null)
  const barres: Barre[] = []

  if (fretted.length === 0) {
    return { fingers, barres, fingerCount: 0 }
  }

  const minFret = Math.min(...fretted.map(x => x.f))
  const maxFret = Math.max(...fretted.map(x => x.f))
  const atMin = fretted.filter(x => x.f === minFret)

  // Lowest sounding string (open or fretted).
  const minSounding = frets.reduce<number>((m, f, s) => (f !== null && s < m ? s : m), frets.length)
  const barreLow = Math.min(...atMin.map(x => x.s))
  const useBarre = atMin.length >= 2 && maxFret > minFret && barreLow === minSounding

  let nextFinger = 1
  let count = 0

  if (useBarre) {
    const from = barreLow
    const to = Math.max(...atMin.map(x => x.s))

    // No muted or lower note may be trapped inside the barre span.
    for (let s = from; s <= to; s++) {
      const f = frets[s]
      if (f === null || f < minFret) return null
    }

    barres.push({ fret: minFret, fromString: from, toString: to, finger: 1 })
    atMin.forEach(x => { fingers[x.s] = 1 })
    nextFinger = 2
    count = 1
    const rest = fretted
      .filter(x => x.f > minFret)
      .sort((a, b) => a.f - b.f || a.s - b.s)
    for (const x of rest) {
      if (nextFinger > MAX_FINGERS) return null
      fingers[x.s] = nextFinger++
      count++
    }
  } else {
    if (fretted.length > MAX_FINGERS) return null
    const ordered = [...fretted].sort((a, b) => a.f - b.f || a.s - b.s)
    for (const x of ordered) {
      fingers[x.s] = nextFinger++
      count++
    }
  }

  return { fingers, barres, fingerCount: count }
}

/**
 * Generates playable voicings for a chord on the given tuning.
 * Strategy: scan 4-fret windows up the neck (plus the open position). Within
 * each window keep voicings that (a) play a contiguous block of strings, (b)
 * have the root as the lowest-sounding note, (c) contain every essential chord
 * tone, and (d) are fingerable with ≤4 fingers. Then keep the best voicing per
 * neck position so the result reads as "positions up the neck".
 */
export function generateChordVoicings(
  root: NoteName,
  intervals: number[],
  tuning: NoteName[],
  totalFrets = 15,
): ChordVoicing[] {
  const n = tuning.length
  const rootPc = pcOf(root)
  const openPc = tuning.map(t => pcOf(t))
  const chordPcs = new Set(intervals.map(iv => (rootPc + iv) % 12))

  // Extended chords (≥4 notes) may omit the perfect 5th when needed.
  const canDropFifth = intervals.length >= 4 && intervals.includes(7)
  const fifthPc = (rootPc + 7) % 12
  const essentialPcs = new Set(chordPcs)
  if (canDropFifth) essentialPcs.delete(fifthPc)

  const noteAt = (s: number, fret: number) => (openPc[s] + fret) % 12

  const seen = new Set<string>()
  const candidates: ChordVoicing[] = []

  // Windows: open position (frets 0–3), then movable windows up the neck.
  const windows: { start: number; end: number }[] = [{ start: 0, end: FRET_SPAN }]
  for (let s = 1; s + FRET_SPAN <= totalFrets; s++) {
    windows.push({ start: s, end: s + FRET_SPAN })
  }

  for (const win of windows) {
    // Candidate frets per string within this window (chord tones only).
    const opts: number[][] = []
    for (let s = 0; s < n; s++) {
      const arr: number[] = []
      for (let f = win.start; f <= win.end; f++) {
        if (f < 0 || f > totalFrets) continue
        if (chordPcs.has(noteAt(s, f))) arr.push(f)
      }
      opts.push(arr)
    }

    // Bass string `b` must be able to play the root; played strings = [b..t].
    for (let b = 0; b < n; b++) {
      const bassFrets = opts[b].filter(f => noteAt(b, f) === rootPc)
      if (bassFrets.length === 0) continue

      for (let t = b; t < n; t++) {
        // Every string in the block must have a chord tone available.
        let viable = true
        for (let s = b; s <= t; s++) {
          if (opts[s].length === 0) { viable = false; break }
        }
        if (!viable) continue

        // Cartesian product over the block (bass restricted to root frets).
        const chosen: number[] = []
        const build = (s: number) => {
          if (s > t) {
            const frets: (number | null)[] = Array(n).fill(null)
            const pcs = new Set<number>()
            for (let i = b; i <= t; i++) {
              frets[i] = chosen[i - b]
              pcs.add(noteAt(i, chosen[i - b]))
            }
            // Must contain every essential chord tone.
            for (const pc of essentialPcs) if (!pcs.has(pc)) return

            const fingered = assignFingers(frets)
            if (!fingered) return

            const key = frets.map(f => (f === null ? 'x' : f)).join('-')
            if (seen.has(key)) return
            seen.add(key)

            const frettedVals = frets.filter((f): f is number => f !== null && f > 0)
            const minFret = frettedVals.length ? Math.min(...frettedVals) : 0
            const maxFret = frettedVals.length ? Math.max(...frettedVals) : 0
            const baseFret = minFret <= 1 ? 1 : minFret

            candidates.push({
              frets,
              fingers: fingered.fingers,
              barres: fingered.barres,
              baseFret,
              minFret,
              maxFret,
              fingerCount: fingered.fingerCount,
            })
            return
          }
          const list = s === b ? bassFrets : opts[s]
          for (const f of list) {
            chosen[s - b] = f
            build(s + 1)
          }
        }
        build(b)
      }
    }
  }

  if (candidates.length === 0) return []

  // Score: fuller (more strings) and easier (fewer fingers / lower) ranks higher.
  const score = (v: ChordVoicing) => {
    const played = v.frets.filter(f => f !== null).length
    return played * 10 - v.fingerCount * 3 - v.maxFret * 0.2
  }

  // Keep the best voicing at each neck position so results spread up the neck.
  const bestByBase = new Map<number, ChordVoicing>()
  for (const v of candidates) {
    const cur = bestByBase.get(v.baseFret)
    if (!cur || score(v) > score(cur)) bestByBase.set(v.baseFret, v)
  }

  return [...bestByBase.values()]
    .sort((a, b) => a.baseFret - b.baseFret)
    .slice(0, 8)
}

/** Spanish label for a voicing's position on the neck. */
export function positionLabel(v: ChordVoicing): string {
  if (v.minFret <= 1) return 'Posición abierta'
  const ord = ['', '1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª', '11ª', '12ª']
  return `${ord[v.minFret] ?? v.minFret + 'ª'} posición`
}
