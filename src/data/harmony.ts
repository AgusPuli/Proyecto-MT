import type { NoteName } from '../types'
import { CHROMATIC_NOTES, keyPrefersFlats, spellNote } from './notes'
import { CHORD_QUALITIES } from './chords'
import type { ParsedChord } from './chordParser'

// ─────────────────────────────────────────────────────────────────────────────
// Harmony — keys, diatonic chords, and chord-vs-key analysis.
// Powers the Songs feature: Roman numerals, harmonic functions, borrowed
// chords, secondary dominants, and progression suggestions.
// All display strings are Spanish (UI language).
// ─────────────────────────────────────────────────────────────────────────────

export type KeyMode = 'major' | 'minor'

export interface SongKey {
  root: NoteName
  mode: KeyMode
}

export type HarmonicFunction = 'tonica' | 'subdominante' | 'dominante'

export const FUNC_LABEL: Record<HarmonicFunction, string> = {
  tonica: 'tónica',
  subdominante: 'subdominante',
  dominante: 'dominante',
}

export interface DiatonicChord {
  degree: number          // 1..7
  root: NoteName
  triadQualityId: string  // 'maj' | 'min' | 'dim'
  seventhQualityId: string
  roman: string           // 'I', 'ii', 'vii°'...
  func: HarmonicFunction
  name: string            // display name of the triad, e.g. 'Bm', 'G#dim'
}

export type ChordRelation =
  | 'diatonic'
  | 'harmonic-minor'   // V / vii° raised in a minor key
  | 'borrowed'         // intercambio modal (parallel key)
  | 'secondary-dominant'
  | 'non-diatonic'

export interface ChordAnalysis {
  chord: ParsedChord
  relation: ChordRelation
  roman: string | null
  func: HarmonicFunction | null
  label: string   // full Spanish tooltip text
}

// ── Degree tables ────────────────────────────────────────────────────────────

interface DegreeDef {
  st: number             // semitones from key root
  triad: string          // quality id
  seventh: string
  roman: string
  func: HarmonicFunction
}

const MAJOR_DEGREES: DegreeDef[] = [
  { st: 0,  triad: 'maj', seventh: 'maj7', roman: 'I',    func: 'tonica' },
  { st: 2,  triad: 'min', seventh: 'm7',   roman: 'ii',   func: 'subdominante' },
  { st: 4,  triad: 'min', seventh: 'm7',   roman: 'iii',  func: 'tonica' },
  { st: 5,  triad: 'maj', seventh: 'maj7', roman: 'IV',   func: 'subdominante' },
  { st: 7,  triad: 'maj', seventh: '7',    roman: 'V',    func: 'dominante' },
  { st: 9,  triad: 'min', seventh: 'm7',   roman: 'vi',   func: 'tonica' },
  { st: 11, triad: 'dim', seventh: 'm7b5', roman: 'vii°', func: 'dominante' },
]

const MINOR_DEGREES: DegreeDef[] = [
  { st: 0,  triad: 'min', seventh: 'm7',   roman: 'i',    func: 'tonica' },
  { st: 2,  triad: 'dim', seventh: 'm7b5', roman: 'ii°',  func: 'subdominante' },
  { st: 3,  triad: 'maj', seventh: 'maj7', roman: 'III',  func: 'tonica' },
  { st: 5,  triad: 'min', seventh: 'm7',   roman: 'iv',   func: 'subdominante' },
  { st: 7,  triad: 'min', seventh: 'm7',   roman: 'v',    func: 'dominante' },
  { st: 8,  triad: 'maj', seventh: 'maj7', roman: 'VI',   func: 'tonica' },
  { st: 10, triad: 'maj', seventh: '7',    roman: 'VII',  func: 'dominante' },
]

// Chords from the harmonic minor scale, used constantly in minor keys.
const MINOR_HARMONIC_EXTRAS: DegreeDef[] = [
  { st: 7,  triad: 'maj', seventh: '7',    roman: 'V',    func: 'dominante' },
  { st: 11, triad: 'dim', seventh: 'dim7', roman: 'vii°', func: 'dominante' },
]

// Roman numeral for borrowed roots that sit outside the home scale (major keys).
const BORROWED_ROMAN_MAJOR: Record<number, string> = {
  3: '♭III', 8: '♭VI', 10: '♭VII', 1: '♭II', 6: '♭V',
}

const pcOf = (n: NoteName): number => CHROMATIC_NOTES.indexOf(n)
const noteOfPc = (pc: number): NoteName => CHROMATIC_NOTES[((pc % 12) + 12) % 12]

const QUALITY_BY_ID = new Map(CHORD_QUALITIES.map(q => [q.id, q]))

function displayName(root: NoteName, qualityId: string): string {
  const q = QUALITY_BY_ID.get(qualityId)
  return `${root}${q ? q.symbol : ''}`
}

// ── Public API ───────────────────────────────────────────────────────────────

export function keyLabel(key: SongKey): string {
  const spelled = spellNote(key.root, keyPrefersFlats(pcOf(key.root)))
  return `${spelled} ${key.mode === 'major' ? 'mayor' : 'menor'}`
}

/** The 7 diatonic triads of the key (natural minor for minor keys). */
export function getDiatonicChords(key: SongKey): DiatonicChord[] {
  const defs = key.mode === 'major' ? MAJOR_DEGREES : MINOR_DEGREES
  const rootPc = pcOf(key.root)
  return defs.map((d, i) => ({
    degree: i + 1,
    root: noteOfPc(rootPc + d.st),
    triadQualityId: d.triad,
    seventhQualityId: d.seventh,
    roman: d.roman,
    func: d.func,
    name: displayName(noteOfPc(rootPc + d.st), d.triad),
  }))
}

/** Harmonic-minor V and vii° for minor keys (empty for major). */
export function getHarmonicMinorExtras(key: SongKey): DiatonicChord[] {
  if (key.mode === 'major') return []
  const rootPc = pcOf(key.root)
  return MINOR_HARMONIC_EXTRAS.map(d => ({
    degree: d.st === 7 ? 5 : 7,
    root: noteOfPc(rootPc + d.st),
    triadQualityId: d.triad,
    seventhQualityId: d.seventh,
    roman: d.roman,
    func: d.func,
    name: displayName(noteOfPc(rootPc + d.st), d.triad),
  }))
}

/**
 * Does `qualityId` count as a match for a degree whose triad/seventh are given?
 * Sus/add/power chords on a diatonic root count as "variante".
 */
function qualityMatch(qualityId: string, deg: DegreeDef): 'exact' | 'variant' | null {
  if (qualityId === deg.triad || qualityId === deg.seventh) return 'exact'
  // maj7 root chord written as "6" or triad extensions
  const VARIANTS = ['5', 'sus2', 'sus4', '6', 'add9', '9']
  if (VARIANTS.includes(qualityId)) {
    // 9 is dominant-flavored: only a variant where the seventh is dominant
    if (qualityId === '9') return deg.seventh === '7' ? 'exact' : null
    return 'variant'
  }
  return null
}

/** Analyzes a chord against the song key. Returns Roman numeral, function, and a Spanish label. */
export function analyzeChord(chord: ParsedChord, key: SongKey): ChordAnalysis {
  const keyPc = pcOf(key.root)
  const chordPc = pcOf(chord.root)
  const dist = ((chordPc - keyPc) + 12) % 12
  const name = chord.input
  const kLabel = keyLabel(key)

  const defs = key.mode === 'major' ? MAJOR_DEGREES : MINOR_DEGREES

  // 1 — Diatonic
  for (const d of defs) {
    if (d.st !== dist) continue
    const match = qualityMatch(chord.quality.id, d)
    if (match === 'exact') {
      const roman = isSeventhQuality(chord.quality.id) ? seventhRoman(d.roman, chord.quality.id) : d.roman
      return {
        chord, relation: 'diatonic', roman, func: d.func,
        label: `${name} — ${roman} de ${kLabel} (${FUNC_LABEL[d.func]}), acorde diatónico`,
      }
    }
    if (match === 'variant') {
      return {
        chord, relation: 'diatonic', roman: d.roman, func: d.func,
        label: `${name} — variante sobre el ${d.roman} de ${kLabel} (${FUNC_LABEL[d.func]})`,
      }
    }
  }

  // 2 — Harmonic minor extras (minor keys)
  if (key.mode === 'minor') {
    for (const d of MINOR_HARMONIC_EXTRAS) {
      if (d.st !== dist) continue
      const match = qualityMatch(chord.quality.id, d)
      if (match) {
        const roman = isSeventhQuality(chord.quality.id) ? seventhRoman(d.roman, chord.quality.id) : d.roman
        return {
          chord, relation: 'harmonic-minor', roman, func: d.func,
          label: `${name} — ${roman} de ${kLabel} (${FUNC_LABEL[d.func]}), de la escala menor armónica`,
        }
      }
    }
  }

  // 3 — Secondary dominant: major/dom chord a perfect 5th above a diatonic root
  if (['maj', '7', '9'].includes(chord.quality.id)) {
    for (const d of defs) {
      if (d.st === 0) continue // a 5th above the tonic-target is just V, caught above
      const targetPc = (keyPc + d.st) % 12
      if (chordPc === (targetPc + 7) % 12) {
        const targetName = displayName(noteOfPc(targetPc), d.triad)
        const roman = `V${chord.quality.id === '7' ? '7' : ''}/${d.roman}`
        return {
          chord, relation: 'secondary-dominant', roman, func: 'dominante',
          label: `${name} — ${roman} (dominante secundario de ${targetName})`,
        }
      }
    }
  }

  // 4 — Borrowed from the parallel key (intercambio modal)
  const parallel: SongKey = { root: key.root, mode: key.mode === 'major' ? 'minor' : 'major' }
  const parallelDefs = parallel.mode === 'major' ? MAJOR_DEGREES : MINOR_DEGREES
  for (const d of parallelDefs) {
    if (d.st !== dist) continue
    const match = qualityMatch(chord.quality.id, d)
    if (match) {
      // Roman relative to the home key: flat-degree notation when outside the scale
      const roman = key.mode === 'major' ? (BORROWED_ROMAN_MAJOR[dist] ?? d.roman) : d.roman
      return {
        chord, relation: 'borrowed', roman, func: d.func,
        label: `${name} — ${roman} de ${kLabel}, prestado de ${keyLabel(parallel)} (intercambio modal)`,
      }
    }
  }

  // 5 — Non-diatonic
  return {
    chord, relation: 'non-diatonic', roman: null, func: null,
    label: `${name} — no diatónico en ${kLabel}`,
  }
}

function isSeventhQuality(id: string): boolean {
  return ['7', 'maj7', 'm7', 'm7b5', 'dim7', '9'].includes(id)
}

function seventhRoman(baseRoman: string, qualityId: string): string {
  if (qualityId === 'maj7') return `${baseRoman}maj7`
  if (qualityId === '9') return `${baseRoman}9`
  return `${baseRoman}7`
}

// ── Progression suggestions ─────────────────────────────────────────────────

// degree → likely next degrees (functional harmony, 1-based)
const NEXT_DEGREES: Record<number, number[]> = {
  1: [4, 5, 6, 2],
  2: [5, 7],
  3: [6, 4],
  4: [5, 1, 2],
  5: [1, 6],
  6: [2, 4],
  7: [1],
}

// Short Spanish reason per (from → to) movement.
const MOVE_REASON: Record<string, string> = {
  '5-1': 'resolución auténtica',
  '5-6': 'cadencia rota (sorpresa)',
  '2-5': 'prepara la dominante',
  '4-5': 'camino clásico a la dominante',
  '4-1': 'cadencia plagal',
  '7-1': 'resuelve la sensible',
  '1-4': 'abre hacia la subdominante',
  '1-5': 'tensión directa',
  '1-6': 'giro al relativo',
  '6-2': 'círculo de quintas',
  '6-4': 'descenso suave',
  '3-6': 'círculo de quintas',
  '2-7': 'refuerza la dominante',
  '1-2': 'arranque ascendente',
  '3-4': 'ascenso melódico',
}

export interface Suggestion {
  chord: DiatonicChord
  reason: string
}

/**
 * Suggests likely next chords given the last chord used.
 * If the last chord is null or outside the key, returns common starters.
 */
export function suggestNextChords(last: ParsedChord | null, key: SongKey): Suggestion[] {
  const diatonic = getDiatonicChords(key)
  const useHarmonicV = key.mode === 'minor'
  const extras = useHarmonicV ? getHarmonicMinorExtras(key) : []
  // In minor keys, prefer the harmonic-minor V over the natural v for suggestions
  const chordForDegree = (deg: number): DiatonicChord => {
    if (useHarmonicV && deg === 5) return extras.find(e => e.degree === 5) ?? diatonic[4]
    return diatonic[deg - 1]
  }

  let fromDegree: number | null = null
  if (last) {
    const keyPc = pcOf(key.root)
    const dist = ((pcOf(last.root) - keyPc) + 12) % 12
    const defs = key.mode === 'major' ? MAJOR_DEGREES : MINOR_DEGREES
    const idx = defs.findIndex(d => d.st === dist)
    if (idx >= 0) fromDegree = idx + 1
    else if (key.mode === 'minor' && dist === 7) fromDegree = 5 // harmonic V
  }

  if (fromDegree === null) {
    // Starters: tonic, subdominant, dominant, relative
    return [1, 4, 5, 6].map(deg => ({
      chord: chordForDegree(deg),
      reason: deg === 1 ? 'la tónica: el hogar' : MOVE_REASON[`1-${deg}`] ?? '',
    }))
  }

  return (NEXT_DEGREES[fromDegree] ?? [1]).map(deg => ({
    chord: chordForDegree(deg),
    reason: MOVE_REASON[`${fromDegree}-${deg}`] ?? '',
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Detección automática de tonalidad
// Puntúa las 24 tonalidades contra los acordes escritos: cuanto más encajan
// como diatónicos (y cuanto más "suena a casa" el último acorde), más puntos.
// ─────────────────────────────────────────────────────────────────────────────

export interface KeyGuess {
  key: SongKey
  score: number
  /** 0..1 — cuánto le saca la mejor tonalidad a la segunda. */
  confidence: number
  /** Acordes que quedan fuera de la tonalidad ganadora. */
  outsiders: number
}

const RELATION_SCORE: Record<ChordRelation, number> = {
  'diatonic':           3,
  'harmonic-minor':     2.5,
  'secondary-dominant': 1,
  'borrowed':           0.5,
  'non-diatonic':      -1.5,
}

/**
 * Adivina la tonalidad a partir de la secuencia de acordes de la canción.
 * Devuelve null si no hay acordes suficientes para decir algo.
 */
export function detectKey(chords: ParsedChord[]): KeyGuess | null {
  if (chords.length < 2) return null

  const scored: KeyGuess[] = []
  for (const root of CHROMATIC_NOTES) {
    for (const mode of ['major', 'minor'] as KeyMode[]) {
      const key: SongKey = { root, mode }
      let score = 0
      let outsiders = 0
      chords.forEach((c, i) => {
        const a = analyzeChord(c, key)
        score += RELATION_SCORE[a.relation]
        if (a.relation === 'non-diatonic') outsiders++
        // El primero y sobre todo el último acorde suelen ser la tónica.
        const isTonic = pcOf(c.root) === pcOf(root)
        if (isTonic && i === chords.length - 1) score += 3
        if (isTonic && i === 0) score += 1.5
        // La calidad de la tónica desempata mayor vs menor.
        if (isTonic) {
          const minorish = c.quality.id === 'min' || c.quality.id === 'm7'
          const majorish = c.quality.id === 'maj' || c.quality.id === 'maj7' || c.quality.id === '6'
          if (mode === 'minor' && minorish) score += 1
          if (mode === 'major' && majorish) score += 1
        }
      })
      scored.push({ key, score, confidence: 0, outsiders })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  const runnerUp = scored[1]
  const spread = best.score - runnerUp.score
  best.confidence = Math.max(0, Math.min(1, spread / Math.max(4, chords.length)))
  return best
}

/** Cuántos acordes de la lista quedan fuera de la tonalidad dada. */
export function countOutsiders(chords: ParsedChord[], key: SongKey): number {
  return chords.filter(c => analyzeChord(c, key).relation === 'non-diatonic').length
}
