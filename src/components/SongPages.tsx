import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ChordAnalysis, ChordRelation, SongKey } from '../data/harmony'
import { keyLabel } from '../data/harmony'
import type { ChordToken, ParsedLine } from '../data/songParser'
import type { Song } from '../data/songStorage'

// ─────────────────────────────────────────────────────────────────────────────
// SongPages — Word-like A4 pages: measures rendered line heights and splits
// the song into as many physical pages as needed, growing automatically as
// you type. The same markup is used for on-screen display and for print/PDF
// (via window.print() + the @media print rules in index.css).
// ─────────────────────────────────────────────────────────────────────────────

interface SongPagesProps {
  song: Song
  parsed: ParsedLine[]
  analyses: Map<string, ChordAnalysis>
  onChordClick?: (srcLineIndex: number, token: ChordToken) => void
}

/** Stable key for the analysis cache: root + quality id. */
export function analysisKey(root: string, qualityId: string): string {
  return `${root}|${qualityId}`
}

const MM_MARGIN = 18
const PAGE_W_MM = 210
const PAGE_H_MM = 297
const CONTENT_H_MM = PAGE_H_MM - MM_MARGIN * 2
const CONTENT_W_MM = PAGE_W_MM - MM_MARGIN * 2

// Dual-tone chord colors: light shade on the app's dark page background on
// screen, dark shade automatically swapped in when printing (white paper).
const RELATION_COLOR: Record<ChordRelation, string> = {
  'diatonic':           'text-amber-400 print:text-amber-700',
  'harmonic-minor':     'text-teal-300 print:text-teal-700',
  'borrowed':           'text-violet-400 print:text-violet-700',
  'secondary-dominant': 'text-orange-400 print:text-orange-700',
  'non-diatonic':       'text-red-400 print:text-red-700',
}

export interface Segment {
  chord: ChordToken | null
  text: string
}

export function buildSegments(lyrics: string, chords: ChordToken[]): Segment[] {
  if (chords.length === 0) return [{ chord: null, text: lyrics }]
  const segments: Segment[] = []
  if (chords[0].charIndex > 0) {
    segments.push({ chord: null, text: lyrics.slice(0, chords[0].charIndex) })
  }
  chords.forEach((token, i) => {
    const end = i + 1 < chords.length ? chords[i + 1].charIndex : lyrics.length
    segments.push({ chord: token, text: lyrics.slice(token.charIndex, end) })
  })
  return segments
}

function ChordLabel({
  token, analysis, onClick,
}: { token: ChordToken; analysis: ChordAnalysis | undefined; onClick?: () => void }) {
  const color = analysis ? RELATION_COLOR[analysis.relation] : 'text-gray-500'
  return (
    <span className="relative group inline-block print:pointer-events-none">
      <button
        onClick={onClick}
        className={`${color} font-bold text-sm leading-tight hover:underline focus:outline-none cursor-pointer print:no-underline`}
      >
        {token.raw}
      </button>
      {analysis && (
        <span className="pointer-events-none absolute left-0 bottom-full mb-1 z-20 hidden group-hover:block print:!hidden
          bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 whitespace-nowrap shadow-lg">
          {analysis.label}
        </span>
      )}
    </span>
  )
}

/** Splits long unbroken runs and preserves multi-space gaps, but always
 * wraps inside the page instead of overflowing past the margin. */
const WRAP_CLASS = 'whitespace-pre-wrap break-words'

function SongLine({
  line, analyses, onChordClick,
}: { line: ParsedLine; analyses: Map<string, ChordAnalysis>; onChordClick?: (srcLineIndex: number, token: ChordToken) => void }) {
  if (line.type === 'blank') return <div className="h-5" />
  if (line.type === 'section') {
    return (
      <div className="text-amber-400 print:text-amber-800 font-bold uppercase tracking-wide mt-5 mb-2 font-sans text-sm">
        [{line.title}]
      </div>
    )
  }
  const segments = buildSegments(line.lyrics, line.chords)
  return (
    <div className="flex flex-wrap items-end mb-1">
      {segments.map((seg, i) => {
        const analysis = seg.chord?.chord
          ? analyses.get(analysisKey(seg.chord.chord.root, seg.chord.chord.quality.id))
          : undefined
        return (
          <span key={i} className="inline-flex flex-col items-start max-w-full">
            {seg.chord ? (
              <ChordLabel
                token={seg.chord}
                analysis={analysis}
                onClick={onChordClick ? () => onChordClick(line.srcLineIndex, seg.chord!) : undefined}
              />
            ) : (
              <span className="text-sm leading-tight">&nbsp;</span>
            )}
            <span className={WRAP_CLASS}>{seg.text || ' '}</span>
          </span>
        )
      })}
    </div>
  )
}

function SongPageHeader({ song, songKey }: { song: Song; songKey: SongKey }) {
  return (
    <div className="mb-6 pb-3 border-b-2 border-gray-700 print:border-gray-300">
      <h1 className="text-2xl font-black text-amber-400 print:text-gray-900">{song.title || 'Sin título'}</h1>
      <p className="text-xs text-gray-400 print:text-gray-500 mt-1">
        Tonalidad: <span className="font-semibold text-gray-200 print:text-gray-700">{keyLabel(songKey)}</span>
        {song.tempo != null && <span className="mx-2">·</span>}
        {song.tempo != null && <>♩ = <span className="font-semibold text-gray-200 print:text-gray-700">{song.tempo}</span></>}
      </p>
    </div>
  )
}

export default function SongPages({ song, parsed, analyses, onChordClick }: SongPagesProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  const pageRulerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const [pages, setPages] = useState<number[][]>([[]])
  const [pagePx, setPagePx] = useState<{ w: number; h: number }>({ w: 794, h: 1123 })
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const maxH = rulerRef.current?.getBoundingClientRect().height ?? 1000
    const headerH = headerRef.current?.getBoundingClientRect().height ?? 0
    const groups: number[][] = []
    let current: number[] = []
    let currentH = 0

    parsed.forEach((_, i) => {
      const h = lineRefs.current[i]?.getBoundingClientRect().height ?? 20
      const isFirstPage = groups.length === 0
      const budget = isFirstPage ? maxH - headerH : maxH
      if (currentH + h > budget && current.length > 0) {
        groups.push(current)
        current = []
        currentH = 0
      }
      current.push(i)
      currentH += h
    })
    groups.push(current)
    setPages(groups)

    const pageRect = pageRulerRef.current?.getBoundingClientRect()
    if (pageRect) setPagePx({ w: pageRect.width, h: pageRect.height })
  }, [parsed, analyses, song.title, song.tempo])

  // Auto-fit: shrink pages to the available width so a non-maximized window
  // (or the split "Ambos" view, which halves the space) never crops them.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const PADDING_PX = 16
    function recalc() {
      const available = (el!.clientWidth || pagePx.w) - PADDING_PX
      setScale(Math.min(1, available / pagePx.w))
    }
    recalc()
    const ro = new ResizeObserver(recalc)
    ro.observe(el)
    window.addEventListener('resize', recalc)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recalc)
    }
  }, [pagePx.w])

  return (
    <div id="song-print-root" ref={rootRef} className="flex flex-col items-center gap-6 py-2 w-full">

      {/* Hidden rulers — real px size of the usable content area and the full page */}
      <div ref={rulerRef}
        style={{ height: `${CONTENT_H_MM}mm`, width: 0, position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }} />
      <div ref={pageRulerRef}
        style={{ width: `${PAGE_W_MM}mm`, height: `${PAGE_H_MM}mm`, position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }} />

      {/* Hidden measuring pass — identical markup to what's actually shown */}
      <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: `${CONTENT_W_MM}mm`, left: -99999 }}>
        <div ref={headerRef}><SongPageHeader song={song} songKey={song.key} /></div>
        {parsed.map((line, i) => (
          <div key={i} ref={el => { lineRefs.current[i] = el }}>
            <SongLine line={line} analyses={analyses} />
          </div>
        ))}
      </div>

      {/* Visible A4 pages — each wrapped in a scale-adjusted frame so it
          always fits on screen; print ignores the scale (see index.css). */}
      {pages.map((lineIdxs, pageIdx) => (
        <div key={pageIdx}
          className="song-page-frame shrink-0"
          style={{ width: pagePx.w * scale, height: pagePx.h * scale }}>
          <div className="song-page bg-gray-900 print:bg-white text-gray-100 print:text-gray-900
              border border-gray-700 print:border-0 font-mono shadow-2xl print:shadow-none"
            style={{
              width: `${PAGE_W_MM}mm`, minHeight: `${PAGE_H_MM}mm`, padding: `${MM_MARGIN}mm`,
              pageBreakAfter: pageIdx < pages.length - 1 ? 'always' : 'auto',
              transform: `scale(${scale})`, transformOrigin: 'top left',
            }}>
            {pageIdx === 0 && <SongPageHeader song={song} songKey={song.key} />}
            {lineIdxs.map(i => {
              // parsed may briefly shrink before pagination re-measures — skip
              // any now-stale index rather than crash on a missing line.
              const line = parsed[i]
              return line ? <SongLine key={i} line={line} analyses={analyses} onChordClick={onChordClick} /> : null
            })}
            {pages.length === 1 && lineIdxs.length === 0 && (
              <div className="text-gray-500 italic font-sans text-sm">
                Escribí tu canción en el modo Editar — los acordes van entre corchetes: [Am]
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
