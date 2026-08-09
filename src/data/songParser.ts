import { parseChord, type ParsedChord } from './chordParser'
import { SHARP_SPELLING, spellNote } from './notes'

// ─────────────────────────────────────────────────────────────────────────────
// Song body parser — ChordPro-ish text ⇄ render model.
//
// Syntax:
//   [Am]La espera me a[C]gotó     → lyric line with anchored chords
//   [Estribillo]                   → section header (whole line, not a chord)
//   (blank line)                   → paragraph break
//
// Disambiguation: a line whose ENTIRE content is one [token] is a section
// header only when the token does NOT parse as a chord. A lone "[Am]" line is
// an instrumental chord line.
// ─────────────────────────────────────────────────────────────────────────────

export interface ChordToken {
  chord: ParsedChord | null  // null = unparseable text in brackets mid-line
  raw: string                // text inside the brackets
  charIndex: number          // anchor position within the stripped lyric text
  srcStart: number           // offsets in the ORIGINAL source line (incl. brackets)
  srcEnd: number
}

export type ParsedLine =
  | { type: 'section'; title: string; srcLineIndex: number }
  | { type: 'lyric'; lyrics: string; chords: ChordToken[]; srcLineIndex: number }
  | { type: 'blank'; srcLineIndex: number }

const TOKEN_RE = /\[([^\]\n]*)\]/g
const SECTION_RE = /^\s*\[([^\]]+)\]\s*$/

export function parseSongBody(body: string): ParsedLine[] {
  return body.split('\n').map((line, srcLineIndex): ParsedLine => {
    if (line.trim() === '') return { type: 'blank', srcLineIndex }

    // Whole-line single [token] that isn't a chord → section header
    const sec = SECTION_RE.exec(line)
    if (sec && parseChord(sec[1]) === null) {
      return { type: 'section', title: sec[1], srcLineIndex }
    }

    // Lyric line: extract chord tokens, build stripped lyric text
    const chords: ChordToken[] = []
    let lyrics = ''
    let lastEnd = 0
    TOKEN_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = TOKEN_RE.exec(line)) !== null) {
      lyrics += line.slice(lastEnd, m.index)
      chords.push({
        chord: parseChord(m[1]),
        raw: m[1],
        charIndex: lyrics.length,
        srcStart: m.index,
        srcEnd: m.index + m[0].length,
      })
      lastEnd = m.index + m[0].length
    }
    lyrics += line.slice(lastEnd)

    return { type: 'lyric', lyrics, chords, srcLineIndex }
  })
}

/** Replaces the chord token at the given source offsets with a new chord name. */
export function replaceChordAt(
  body: string,
  srcLineIndex: number,
  srcStart: number,
  srcEnd: number,
  newChord: string,
): string {
  const lines = body.split('\n')
  const line = lines[srcLineIndex]
  if (line === undefined) return body
  lines[srcLineIndex] = line.slice(0, srcStart) + (newChord ? `[${newChord}]` : '') + line.slice(srcEnd)
  return lines.join('\n')
}

/** Inserts "[chordName]" at a character offset of the full body (textarea cursor). */
export function insertChordAtOffset(body: string, offset: number, chordName: string): string {
  const clamped = Math.max(0, Math.min(offset, body.length))
  return body.slice(0, clamped) + `[${chordName}]` + body.slice(clamped)
}

/** All successfully-parsed chords in document order (for "last chord" suggestions). */
export function extractChordSequence(parsed: ParsedLine[]): ParsedChord[] {
  const out: ParsedChord[] = []
  for (const line of parsed) {
    if (line.type !== 'lyric') continue
    for (const t of line.chords) {
      if (t.chord) out.push(t.chord)
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Transposición
// Reescribe solo los tokens que son acordes: los títulos de sección ([Intro],
// [Estribillo]) y el texto suelto quedan intactos. Se conserva el sufijo tal
// como lo escribió el usuario ("Bbmaj7" +2 → "Cmaj7"), solo cambia la letra.
// ─────────────────────────────────────────────────────────────────────────────

/** "Am" +3 → "Cm". Devuelve el texto original si no es un acorde. */
export function transposeChordName(raw: string, semitones: number, useFlats = false): string {
  const chord = parseChord(raw)
  if (!chord) return raw
  const m = /^\s*([A-G][#b♭♯]?)(.*)$/.exec(raw.trim())
  if (!m) return raw
  const suffix = m[2]
  const fromPc = SHARP_SPELLING.indexOf(chord.root)
  const toPc = ((fromPc + semitones) % 12 + 12) % 12
  return spellNote(SHARP_SPELLING[toPc], useFlats) + suffix
}

/** Transpone todos los acordes del cuerpo de la canción. */
export function transposeSongBody(body: string, semitones: number, useFlats = false): string {
  if (semitones === 0) return body
  return body.replace(/\[([^\]\n]*)\]/g, (whole, inner: string) => {
    const moved = transposeChordName(inner, semitones, useFlats)
    return moved === inner ? whole : `[${moved}]`
  })
}
