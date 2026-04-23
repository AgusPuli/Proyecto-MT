import { useState, useEffect, useRef, useMemo } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Duration = 'w' | 'h' | 'q' | 'e' | 's'
type Articulation = '' | 'S' | 'P' | 'T'   // slap, pop, tap

interface TabCell {
  fret:         number | null
  isDead:       boolean
  isGhost:      boolean
  preTech:      string        // '' | '/' | '\' | 'h' | 'p'
  postTech:     string        // '' | '/' | '\' | 'b' | '~'
  isPM:         boolean
  articulation: Articulation  // NEW: slap / pop / tap
}

interface TabBeat {
  id:       string
  cells:    [TabCell, TabCell, TabCell, TabCell]
  duration: Duration
  dotted:   boolean   // NEW: dotted note — 1.5× visual width
  isRest:   boolean   // NEW: explicit rest — gap with rest symbol, no notes
  chord:    string    // NEW: chord name shown above (e.g. "Am", "G7")
}

interface TabMeasure {
  id:          string
  beats:       TabBeat[]
  repeatStart: boolean
  repeatEnd:   boolean
  section:     string
}

interface TabSong {
  id:            string
  title:         string
  artist:        string
  tempo:         number
  timeSignature: [number, number]
  key:           string
  measures:      TabMeasure[]
  createdAt:     number
  updatedAt:     number
}

interface Cursor { measureIdx: number; beatIdx: number; stringIdx: number }

interface CtxMenu {
  screenX: number; screenY: number
  measureIdx: number; beatIdx: number; stringIdx: number
}

/** Beat selection range within a single measure */
interface SelRange { mi: number; bi0: number; bi1: number }

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STRING_LABELS = ['G', 'D', 'A', 'E']
const LABEL_W       = 24
const TIME_SIG_W    = 30    // extra space for time-signature (first measure, first row)

/** Base pixel width per beat duration */
const DURATION_WIDTH: Record<Duration, number> = {
  w: 96, h: 68, q: 46, e: 32, s: 24,
}
/** Dotted notes are 1.5× wider */
function beatWidth(dur: Duration, dotted = false): number {
  return Math.round(DURATION_WIDTH[dur] * (dotted ? 1.5 : 1))
}

const STRING_SPACING = 22
const TOP_PAD        = 50    // space: chord (y≤12) + section/tempo (y≤20) + stems (y=20..44)
const BOT_PAD        = 14
const SVG_H          = TOP_PAD + STRING_SPACING * 3 + BOT_PAD  // 130px
const STRING_Y       = [0,1,2,3].map(i => TOP_PAD + STRING_SPACING * i)

const STEM_BOT = TOP_PAD - 8   // 42 — bottom of stem / note-head centre
const STEM_TOP = 20             // top of stem
const BEAM_H   = 3
const FLAG_CLR = '#9ca3af'
const CHORD_Y  = 10            // y for chord name text

const DURATION_INFO: Record<Duration, { label: string; symbol: string }> = {
  w: { label: 'Redonda',     symbol: '○' },
  h: { label: 'Blanca',      symbol: '◑' },
  q: { label: 'Negra',       symbol: '●' },
  e: { label: 'Corchea',     symbol: '♪' },
  s: { label: 'Semicorchea', symbol: '♬' },
}
const DURATION_ORDER: Duration[] = ['w', 'h', 'q', 'e', 's']

const ARTICULATION_INFO: Record<Articulation, { label: string; color: string }> = {
  '':  { label: 'Normal',  color: '' },
  'S': { label: 'Slap',    color: '#f59e0b' },
  'P': { label: 'Pop',     color: '#60a5fa' },
  'T': { label: 'Tap',     color: '#34d399' },
}

const KEYS = [
  'C','G','D','A','E','B','F#','Gb','F','Bb','Eb','Ab','Db',
  'Am','Em','Bm','F#m','C#m','G#m','Dm','Gm','Cm','Fm','Bbm',
]
const TIME_SIGS = ['2/4','3/4','4/4','5/4','6/4','6/8','7/8','12/8']
const SECTIONS  = ['Intro','Verso','Pre-Coro','Coro','Puente','Solo','Riff','Breakdown','Outro']
const STORAGE_KEY = 'basstheory-tabs'

const COMMON_CHORDS = [
  'Am','A','A7','Am7','Amaj7',
  'Bm','B','B7','Bm7',
  'C','Cmaj7','C7',
  'Dm','D','D7','Dm7',
  'Em','E','E7','Em7',
  'F','Fmaj7','F7',
  'Gm','G','G7','Gmaj7',
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

let _seq = 0
const uid = () => `t${Date.now()}_${++_seq}`

function emptyCell(): TabCell {
  return { fret: null, isDead: false, isGhost: false, preTech: '', postTech: '', isPM: false, articulation: '' }
}
function emptyBeat(): TabBeat {
  return {
    id: uid(),
    cells: [emptyCell(), emptyCell(), emptyCell(), emptyCell()],
    duration: 'q',
    dotted: false,
    isRest: false,
    chord: '',
  }
}
function restBeat(dur: Duration = 'q'): TabBeat {
  return { ...emptyBeat(), isRest: true, duration: dur }
}
function emptyMeasure(beats = 4): TabMeasure {
  return { id: uid(), beats: Array.from({ length: beats }, emptyBeat), repeatStart: false, repeatEnd: false, section: '' }
}
function newSong(): TabSong {
  return {
    id: uid(), title: 'Sin título', artist: '', tempo: 120,
    timeSignature: [4, 4], key: 'Am',
    measures: Array.from({ length: 4 }, () => emptyMeasure()),
    createdAt: Date.now(), updatedAt: Date.now(),
  }
}

function deepCopy<T>(x: T): T { return JSON.parse(JSON.stringify(x)) }
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

function cellText(c: TabCell): string {
  if (c.isDead) return 'x'
  if (c.fret === null) return ''
  const core = c.isGhost ? `(${c.fret})` : String(c.fret)
  return (c.preTech || '') + core + (c.postTech || '')
}
function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' })
}
function beatDur(b: TabBeat): Duration { return b.duration ?? 'q' }
function bwOf(b: TabBeat) { return beatWidth(beatDur(b), b.dotted ?? false) }

// ─────────────────────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────────────────────

function loadAllSongs(): TabSong[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveAllSongs(songs: TabSong[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(songs)) } catch {}
}
function upsertSong(song: TabSong) {
  const all = loadAllSongs()
  const idx = all.findIndex(s => s.id === song.id)
  if (idx >= 0) all[idx] = song; else all.unshift(song)
  saveAllSongs(all)
}
function removeSong(id: string) { saveAllSongs(loadAllSongs().filter(s => s.id !== id)) }

// ─────────────────────────────────────────────────────────────────────────────
// Song library modal
// ─────────────────────────────────────────────────────────────────────────────

function SongLibrary({ currentId, onLoad, onClose }: {
  currentId: string; onLoad: (s: TabSong) => void; onClose: () => void
}) {
  const [songs, setSongs] = useState(() => loadAllSongs().sort((a, b) => b.updatedAt - a.updatedAt))

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta tablatura?')) return
    removeSong(id); setSongs(p => p.filter(s => s.id !== id))
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center px-5 py-3 border-b border-gray-800">
          <span className="font-black text-white text-base">📂 Mis Tablaturas</span>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-gray-300 text-xl leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {songs.length === 0 && <p className="text-gray-600 text-sm text-center py-10">No hay tablaturas guardadas.</p>}
          {songs.map(s => (
            <div key={s.id} onClick={() => { onLoad(s); onClose() }}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${s.id === currentId ? 'border-amber-700/60 bg-amber-900/20' : 'border-gray-800 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/60'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{s.title || 'Sin título'}</p>
                <p className="text-gray-500 text-xs truncate">{s.artist || '—'} · {fmtDate(s.updatedAt)} · {s.measures.length} compases</p>
              </div>
              {s.id === currentId && <span className="text-xs font-semibold text-amber-500">activa</span>}
              <button onClick={e => handleDelete(s.id, e)} className="text-gray-700 hover:text-red-400 p-1">🗑</button>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-800">
          <p className="text-gray-700 text-xs">Guardado automático en este dispositivo.</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Rest symbol SVG renderer
// ─────────────────────────────────────────────────────────────────────────────

function RestSymbol({ cx, dur }: { cx: number; dur: Duration }) {
  const x = cx
  const mid = STEM_BOT - 4   // vertical centre for the rest symbol

  switch (dur) {
    case 'w': // Whole rest: filled rect hanging from a line
      return <>
        <line x1={x - 8} y1={mid - 2} x2={x + 8} y2={mid - 2} stroke={FLAG_CLR} strokeWidth={1} />
        <rect x={x - 7} y={mid - 2} width={14} height={5} fill={FLAG_CLR} rx={1} />
      </>
    case 'h': // Half rest: filled rect sitting on a line
      return <>
        <rect x={x - 7} y={mid - 5} width={14} height={5} fill={FLAG_CLR} rx={1} />
        <line x1={x - 8} y1={mid} x2={x + 8} y2={mid} stroke={FLAG_CLR} strokeWidth={1} />
      </>
    case 'q': // Quarter rest: Z-shape
      return <path
        d={`M ${x - 3} ${mid - 9} L ${x + 4} ${mid - 5} L ${x - 3} ${mid} Q ${x - 6} ${mid + 4} ${x} ${mid + 6}`}
        fill="none" stroke={FLAG_CLR} strokeWidth={1.5} strokeLinecap="round" />
    case 'e': // Eighth rest
      return <path
        d={`M ${x + 1} ${mid - 7} A 3 3 0 1 0 ${x + 4} ${mid - 2} L ${x - 3} ${mid + 5}`}
        fill="none" stroke={FLAG_CLR} strokeWidth={1.5} strokeLinecap="round" />
    case 's': // Sixteenth rest: two flags
      return <path
        d={`M ${x + 1} ${mid - 8} A 3 3 0 1 0 ${x + 4} ${mid - 3} L ${x - 3} ${mid + 4}
            M ${x + 1} ${mid - 2} A 3 3 0 1 0 ${x + 4} ${mid + 3} L ${x - 3} ${mid + 9}`}
        fill="none" stroke={FLAG_CLR} strokeWidth={1.5} strokeLinecap="round" />
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Beat stem / note-head renderer
// ─────────────────────────────────────────────────────────────────────────────

function BeatStem({ cx, bw, dur, dotted, beamed = false }: {
  cx: number; bw: number; dur: Duration; dotted?: boolean; beamed?: boolean
}) {
  const x   = Math.round(cx + bw / 2)
  const hy  = STEM_BOT - 2

  // Dot (for dotted notes): small circle to the right of the note head
  const dot = dotted
    ? <circle cx={x + 8} cy={hy - 1} r={2} fill={FLAG_CLR} />
    : null

  if (dur === 'w') {
    return <>{dot}<ellipse cx={x} cy={hy} rx={5} ry={3.5} fill="none" stroke={FLAG_CLR} strokeWidth={1.5} /></>
  }

  const stemEl = <line x1={x} y1={STEM_TOP} x2={x} y2={STEM_BOT} stroke={FLAG_CLR} strokeWidth={1.5} />

  if (dur === 'h') {
    return <>{stemEl}{dot}<ellipse cx={x} cy={hy} rx={5} ry={3.5} fill="none" stroke={FLAG_CLR} strokeWidth={1.5} /></>
  }

  const head = <ellipse cx={x} cy={hy} rx={4.5} ry={3} fill={FLAG_CLR} />

  if (dur === 'q') return <>{stemEl}{head}{dot}</>

  if (dur === 'e') {
    return <>
      {stemEl}{head}{dot}
      {!beamed && (
        <path d={`M ${x} ${STEM_TOP} C ${x + 9} ${STEM_TOP + 5} ${x + 8} ${STEM_TOP + 10} ${x + 1} ${STEM_TOP + 12}`}
          fill="none" stroke={FLAG_CLR} strokeWidth={1.5} strokeLinecap="round" />
      )}
    </>
  }

  // Sixteenth
  return <>
    {stemEl}{head}{dot}
    {!beamed && <>
      <path d={`M ${x} ${STEM_TOP}   C ${x + 9} ${STEM_TOP + 5}  ${x + 8} ${STEM_TOP + 10} ${x + 1} ${STEM_TOP + 12}`}
        fill="none" stroke={FLAG_CLR} strokeWidth={1.5} strokeLinecap="round" />
      <path d={`M ${x} ${STEM_TOP + 7} C ${x + 9} ${STEM_TOP + 12} ${x + 8} ${STEM_TOP + 17} ${x + 1} ${STEM_TOP + 19}`}
        fill="none" stroke={FLAG_CLR} strokeWidth={1.5} strokeLinecap="round" />
    </>}
  </>
}

// ─────────────────────────────────────────────────────────────────────────────
// Beaming helper
// ─────────────────────────────────────────────────────────────────────────────

interface BeamGroup { start: number; end: number; dur: 'e' | 's' }

function computeBeamGroups(beats: TabBeat[]): BeamGroup[] {
  const groups: BeamGroup[] = []
  let i = 0
  while (i < beats.length) {
    const b = beats[i]
    const d = beatDur(b)
    // Rests break beams
    if (!b.isRest && (d === 'e' || d === 's')) {
      let j = i + 1
      while (j < beats.length && !beats[j].isRest && beatDur(beats[j]) === d) j++
      if (j - i >= 2) groups.push({ start: i, end: j - 1, dur: d })
      i = j
    } else { i++ }
  }
  return groups
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG row renderer
// ─────────────────────────────────────────────────────────────────────────────

interface RowEntry { measure: TabMeasure; globalIdx: number }

function TabRowSvg({ entries, cursor, selRange, timeSignature, tempo, isFirstRow,
  onCellClick, onBeatClick, onCellContextMenu }: {
  entries:           RowEntry[]
  cursor:            Cursor | null
  selRange:          SelRange | null
  timeSignature?:    [number, number]
  tempo?:            number
  isFirstRow?:       boolean
  onCellClick:       (mi: number, bi: number, si: number, shift: boolean) => void
  onBeatClick:       (mi: number, bi: number, shift: boolean) => void
  onCellContextMenu: (mi: number, bi: number, si: number, x: number, y: number) => void
}) {
  const extraLeft = (isFirstRow && timeSignature) ? TIME_SIG_W : 0

  const measWidths = entries.map((e, i) =>
    (i === 0 ? LABEL_W + (isFirstRow && timeSignature ? extraLeft : 0) : 0) +
    e.measure.beats.reduce((acc, b) => acc + bwOf(b), 0)
  )
  const startX: number[] = []
  let cxAcc = 0
  for (let i = 0; i < entries.length; i++) { startX.push(cxAcc); cxAcc += measWidths[i] + 2 }
  const totalW = cxAcc + 4

  const barTop = STRING_Y[0] - 9
  const barBot = STRING_Y[3] + 9

  return (
    <svg width={totalW} height={SVG_H} style={{ fontFamily: 'monospace', userSelect: 'none', display: 'block' }}>
      {/* String lines */}
      {STRING_Y.map((y, si) => (
        <line key={si} x1={0} y1={y} x2={totalW} y2={y}
          stroke={si === 3 ? '#9ca3af' : '#6b7280'} strokeWidth={si === 3 ? 1.5 : 1} />
      ))}

      {entries.map(({ measure, globalIdx: mi }, i) => {
        const mx  = startX[i]
        const lw  = i === 0 ? LABEL_W : 0
        const bx0 = mx + lw + (i === 0 && isFirstRow && timeSignature ? extraLeft : 0)
        const baw = measure.beats.reduce((acc, b) => acc + bwOf(b), 0)

        // Beat start positions
        const beatStartX: number[] = []
        let bxAcc2 = bx0
        for (const b of measure.beats) { beatStartX.push(bxAcc2); bxAcc2 += bwOf(b) }

        // Beam groups
        const beamGroups = computeBeamGroups(measure.beats)
        const beamedSet  = new Set<number>()
        for (const g of beamGroups) for (let k = g.start; k <= g.end; k++) beamedSet.add(k)

        // Selection range (normalised so bi0 ≤ bi1)
        const selActive = selRange && selRange.mi === mi
        const selLo = selActive ? Math.min(selRange.bi0, selRange.bi1) : -1
        const selHi = selActive ? Math.max(selRange.bi0, selRange.bi1) : -1

        return (
          <g key={measure.id}>
            {/* String labels */}
            {i === 0 && STRING_Y.map((y, si) => (
              <text key={si} x={mx + 5} y={y} textAnchor="start" dominantBaseline="central"
                fontSize={11} fontWeight="bold" fill="#6b7280" style={{ pointerEvents: 'none' }}>
                {STRING_LABELS[si]}
              </text>
            ))}

            {/* Time sig + tempo (first row, first measure) */}
            {i === 0 && isFirstRow && timeSignature && (
              <>
                {tempo && (
                  <text x={mx + LABEL_W + extraLeft / 2} y={17} textAnchor="middle"
                    fontSize={8} fill="#6b7280" style={{ pointerEvents: 'none' }}>♩={tempo}</text>
                )}
                <text x={mx + LABEL_W + extraLeft / 2} y={STRING_Y[0] + 5}
                  textAnchor="middle" fontSize={19} fontWeight="900"
                  fill="#9ca3af" fontFamily="serif" style={{ pointerEvents: 'none' }}>
                  {timeSignature[0]}
                </text>
                <text x={mx + LABEL_W + extraLeft / 2} y={STRING_Y[2] + 7}
                  textAnchor="middle" fontSize={19} fontWeight="900"
                  fill="#9ca3af" fontFamily="serif" style={{ pointerEvents: 'none' }}>
                  {timeSignature[1]}
                </text>
              </>
            )}

            {/* Section label */}
            {measure.section && (
              <text x={bx0 + 4} y={16} fontSize={8} fontWeight="bold" fill="#f59e0b"
                style={{ pointerEvents: 'none' }}>▶ {measure.section.toUpperCase()}</text>
            )}

            {/* Left barline */}
            <line x1={bx0} y1={barTop} x2={bx0} y2={barBot}
              stroke={measure.repeatStart ? '#f59e0b' : '#9ca3af'}
              strokeWidth={measure.repeatStart ? 3 : 2} />
            {measure.repeatStart && <>
              <line x1={bx0 + 4} y1={barTop} x2={bx0 + 4} y2={barBot} stroke="#f59e0b" strokeWidth={1} />
              <circle cx={bx0 + 9} cy={STRING_Y[1]} r={2.5} fill="#f59e0b" />
              <circle cx={bx0 + 9} cy={STRING_Y[2]} r={2.5} fill="#f59e0b" />
            </>}

            {/* Beats */}
            {measure.beats.map((beat, bi) => {
              const bx      = beatStartX[bi]
              const bw      = bwOf(beat)
              const dur     = beatDur(beat)
              const halfBw  = bw / 2
              const isBeamed = beamedSet.has(bi)
              const isSel   = bi >= selLo && bi <= selHi
              const isRestB  = beat.isRest ?? false

              return (
                <g key={beat.id}>
                  {/* Selection highlight */}
                  {isSel && (
                    <rect x={bx + 1} y={barTop} width={bw - 2} height={barBot - barTop}
                      fill="#1e3a5f" rx={2} opacity={0.6} style={{ pointerEvents: 'none' }} />
                  )}

                  {/* Chord name */}
                  {beat.chord && (
                    <text x={bx + halfBw} y={CHORD_Y} textAnchor="middle"
                      fontSize={9} fontStyle="italic" fontWeight="600" fill="#fbbf24"
                      style={{ pointerEvents: 'none' }}>
                      {beat.chord}
                    </text>
                  )}

                  {/* Notation above staff */}
                  {isRestB ? (
                    // Rest symbol
                    <RestSymbol cx={bx + halfBw} dur={dur} />
                  ) : (
                    // Note head + stem
                    <BeatStem cx={bx} bw={bw} dur={dur} dotted={beat.dotted} beamed={isBeamed} />
                  )}

                  {/* Cells */}
                  {STRING_Y.map((y, si) => {
                    const cell  = beat.cells[si]
                    const text  = isRestB ? '' : cellText(cell)
                    const isCur = cursor?.measureIdx === mi && cursor?.beatIdx === bi && cursor?.stringIdx === si
                    const art   = cell.articulation ?? ''
                    // Colour for articulation badge
                    const artClr = art === 'S' ? '#f59e0b' : art === 'P' ? '#60a5fa' : art === 'T' ? '#34d399' : ''

                    return (
                      <g key={si}>
                        {/* Selection / cursor backgrounds */}
                        {isCur && !isSel && (
                          <rect x={bx + 2} y={y - 10} width={bw - 4} height={20}
                            fill="#0d3d38" rx={3} data-cursor="true" />
                        )}

                        {/* Palm mute tag */}
                        {!isRestB && (cell.isPM ?? false) && (
                          <text x={bx + halfBw} y={y - 13} textAnchor="middle"
                            fontSize={7} fontWeight="bold" fill="#8b5cf6"
                            style={{ pointerEvents: 'none' }}>PM</text>
                        )}

                        {/* Articulation badge (S/P/T) */}
                        {!isRestB && art && (
                          <>
                            <circle cx={bx + bw - 7} cy={y - 8} r={5} fill={artClr} opacity={0.85} />
                            <text x={bx + bw - 7} y={y - 8} textAnchor="middle" dominantBaseline="central"
                              fontSize={6} fontWeight="900" fill="#000" style={{ pointerEvents: 'none' }}>
                              {art}
                            </text>
                          </>
                        )}

                        {/* Fret number */}
                        {!isRestB && text ? (
                          <text x={bx + halfBw} y={y} textAnchor="middle" dominantBaseline="central"
                            fontSize={text.length > 3 ? 9 : text.length > 2 ? 10 : 12} fontWeight="700"
                            fill={isCur ? '#2dd4bf' : text === 'x' ? '#f87171' : '#f1f5f9'}
                            style={{ pointerEvents: 'none' }}>
                            {text}
                          </text>
                        ) : isCur && !isRestB ? (
                          <rect x={bx + halfBw - 1} y={y - 7} width={2} height={14}
                            fill="#2dd4bf" rx={1} className="tab-cursor-blink" data-cursor="true" />
                        ) : null}

                        {/* Rest: dash on each string line */}
                        {isRestB && (
                          <line x1={bx + halfBw - 5} y1={y} x2={bx + halfBw + 5} y2={y}
                            stroke="#374151" strokeWidth={2} style={{ pointerEvents: 'none' }} />
                        )}

                        {/* Click target */}
                        <rect x={bx} y={y - 11} width={bw} height={22} fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onClick={e => onCellClick(mi, bi, si, e.shiftKey)}
                          onContextMenu={e => { e.preventDefault(); onCellContextMenu(mi, bi, si, e.clientX, e.clientY) }}
                        />
                      </g>
                    )
                  })}

                  {/* Transparent beat overlay (for shift-click on beat) */}
                  <rect x={bx} y={barTop} width={bw} height={barBot - barTop} fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onClick={e => onBeatClick(mi, bi, e.shiftKey)}
                  />
                </g>
              )
            })}

            {/* Beams */}
            {beamGroups.map((g, gi) => {
              const x1 = Math.round(beatStartX[g.start] + bwOf(measure.beats[g.start]) / 2)
              const x2 = Math.round(beatStartX[g.end]   + bwOf(measure.beats[g.end])   / 2)
              return (
                <g key={gi}>
                  <line x1={x1} y1={STEM_TOP} x2={x2} y2={STEM_TOP}
                    stroke={FLAG_CLR} strokeWidth={BEAM_H} strokeLinecap="round" />
                  {g.dur === 's' && (
                    <line x1={x1} y1={STEM_TOP + 5} x2={x2} y2={STEM_TOP + 5}
                      stroke={FLAG_CLR} strokeWidth={BEAM_H} strokeLinecap="round" />
                  )}
                </g>
              )
            })}

            {/* Right barline */}
            <line x1={bx0 + baw} y1={barTop} x2={bx0 + baw} y2={barBot}
              stroke={measure.repeatEnd ? '#f59e0b' : '#9ca3af'} strokeWidth={measure.repeatEnd ? 3 : 2} />
            {measure.repeatEnd && <>
              <line x1={bx0 + baw - 4} y1={barTop} x2={bx0 + baw - 4} y2={barBot} stroke="#f59e0b" strokeWidth={1} />
              <circle cx={bx0 + baw - 9} cy={STRING_Y[1]} r={2.5} fill="#f59e0b" />
              <circle cx={bx0 + baw - 9} cy={STRING_Y[2]} r={2.5} fill="#f59e0b" />
            </>}

            {/* Measure number */}
            <text x={bx0 + baw / 2} y={SVG_H - 3} textAnchor="middle" fontSize={8} fill="#374151"
              style={{ pointerEvents: 'none' }}>{mi + 1}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Right-click context menu
// ─────────────────────────────────────────────────────────────────────────────

function ContextMenu({ menu, song, cursor, onTechToggle, onSetDuration, onCellToggle,
  onToggleRest, onToggleDotted, onSetArticulation, onClose }: {
  menu:              CtxMenu
  song:              TabSong
  cursor:            Cursor | null
  onTechToggle:      (field: 'preTech' | 'postTech', value: string) => void
  onSetDuration:     (dur: Duration) => void
  onCellToggle:      (field: 'isDead' | 'isGhost' | 'isPM') => void
  onToggleRest:      () => void
  onToggleDotted:    () => void
  onSetArticulation: (art: Articulation) => void
  onClose:           () => void
}) {
  const cell = cursor ? song.measures[cursor.measureIdx]?.beats[cursor.beatIdx]?.cells[cursor.stringIdx] : null
  const beat = cursor ? song.measures[cursor.measureIdx]?.beats[cursor.beatIdx] : null
  const dur  = beat ? beatDur(beat) : 'q'

  const x = Math.min(menu.screenX, window.innerWidth  - 240)
  const y = Math.min(menu.screenY, window.innerHeight - 480)

  function btn(label: string, active: boolean, onClick: () => void, colorCls = '') {
    return (
      <button key={label} onClick={() => { onClick(); onClose() }}
        className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2 ${active
          ? `font-bold ${colorCls || 'text-teal-400 bg-teal-900/40'}`
          : 'text-gray-300 hover:bg-gray-700'}`}>
        {label}
      </button>
    )
  }

  return (
    <div className="fixed z-[80] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
      style={{ left: x, top: y, width: 234 }} onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
        <span className="text-gray-400 text-xs">
          Cuerda <strong className="text-white">{STRING_LABELS[menu.stringIdx]}</strong>
          {cell?.fret !== null && !cell?.isDead
            ? <> · Traste <strong className="text-amber-400">{cell?.fret}</strong></>
            : null}
        </span>
        <button onClick={onClose} className="ml-auto text-gray-600 hover:text-gray-400">✕</button>
      </div>

      <div className="p-2 space-y-2 max-h-[420px] overflow-y-auto">
        {/* Beat options */}
        <div>
          <p className="px-1 pb-1 text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Beat</p>
          <div className="grid grid-cols-2 gap-0.5">
            {btn('𝄽 Silencio / Rest', !!(beat?.isRest), onToggleRest, beat?.isRest ? 'text-blue-400 bg-blue-900/40' : '')}
            {btn('· Con puntillo',    !!(beat?.dotted),  onToggleDotted, beat?.dotted ? 'text-orange-400 bg-orange-900/30' : '')}
          </div>
        </div>

        {/* Articulation (bass-specific) */}
        <div className="border-t border-gray-800 pt-2">
          <p className="px-1 pb-1 text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Articulación</p>
          <div className="grid grid-cols-2 gap-0.5">
            {(['S', 'P', 'T', ''] as Articulation[]).map(art => {
              const info = ARTICULATION_INFO[art]
              const active = (cell?.articulation ?? '') === art
              return btn(
                art === '' ? '— Normal' : `${art} ${info.label}`,
                active,
                () => onSetArticulation(art),
                active && art ? `text-yellow-300 bg-yellow-900/30` : ''
              )
            })}
          </div>
        </div>

        {/* Techniques */}
        <div className="border-t border-gray-800 pt-2">
          <p className="px-1 pb-1 text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Técnicas</p>
          <div className="grid grid-cols-2 gap-0.5">
            {btn('/ Slide ↑',    cell?.preTech === '/',   () => onTechToggle('preTech', '/'))}
            {btn('\\ Slide ↓',   cell?.preTech === '\\',  () => onTechToggle('preTech', '\\'))}
            {btn('h Hammer-on',  cell?.preTech === 'h',   () => onTechToggle('preTech', 'h'))}
            {btn('p Pull-off',   cell?.preTech === 'p',   () => onTechToggle('preTech', 'p'))}
            {btn('b Bend',       cell?.postTech === 'b',  () => onTechToggle('postTech', 'b'))}
            {btn('~ Vibrato',    cell?.postTech === '~',  () => onTechToggle('postTech', '~'))}
            {btn('x Nota muerta', !!(cell?.isDead), () => onCellToggle('isDead'), 'text-red-400 bg-red-900/40')}
            {btn('() Fantasma',  !!(cell?.isGhost), () => onCellToggle('isGhost'))}
          </div>
          <button onClick={() => { onCellToggle('isPM'); onClose() }}
            className={`w-full mt-0.5 text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${cell?.isPM ? 'text-purple-400 bg-purple-900/40 font-bold' : 'text-gray-300 hover:bg-gray-700'}`}>
            PM Palm Mute
          </button>
        </div>

        {/* Duration */}
        <div className="border-t border-gray-800 pt-2">
          <p className="px-1 pb-1 text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Duración</p>
          <div className="space-y-0.5">
            {DURATION_ORDER.map(d => {
              const { label, symbol } = DURATION_INFO[d]
              const active = dur === d
              return (
                <button key={d} onClick={() => { onSetDuration(d); onClose() }}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center gap-2 transition-colors ${active ? 'text-amber-300 bg-amber-900/40 font-bold' : 'text-gray-300 hover:bg-gray-700'}`}>
                  <span className="text-base w-5 text-center">{symbol}</span>
                  <span>{label}</span>
                  {active && <span className="ml-auto text-amber-600 text-[10px]">✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Print layout helper — packs measures into rows that fit within paperW px
// ─────────────────────────────────────────────────────────────────────────────

const PRINT_W = 710   // usable inner width for PDF (fits A4 at 96dpi)

function computePrintRows(measures: TabMeasure[]): RowEntry[][] {
  const rows: RowEntry[][] = []
  let row: RowEntry[] = []
  let rowW = 0

  for (let idx = 0; idx < measures.length; idx++) {
    const m   = measures[idx]
    const isFirstInRow   = row.length === 0
    const isVeryFirst    = idx === 0 && rows.length === 0
    const beatW = m.beats.reduce((acc, b) => acc + bwOf(b), 0)
    const mw = (isFirstInRow ? LABEL_W : 0) + (isVeryFirst ? TIME_SIG_W : 0) + beatW + 2

    if (!isFirstInRow && rowW + mw > PRINT_W) {
      rows.push(row)
      row   = [{ measure: m, globalIdx: idx }]
      rowW  = LABEL_W + beatW + 2
    } else {
      row.push({ measure: m, globalIdx: idx })
      rowW += mw
    }
  }
  if (row.length) rows.push(row)
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface Props { visible: boolean; onClose: () => void }

export default function TabEditor({ visible, onClose }: Props) {
  const [song, setSong]           = useState<TabSong>(() => { const s = loadAllSongs(); return s.length ? s[0] : newSong() })
  const [cursor, setCursor]       = useState<Cursor | null>(null)
  const [selRange, setSelRange]   = useState<SelRange | null>(null)
  const [pendingDigit, setPending] = useState('')
  const [measPerRow, setMPR]      = useState(4)
  const [showLib, setShowLib]     = useState(false)
  const [clipboard, setClipboard] = useState<TabMeasure | null>(null)
  const [beatClip, setBeatClip]   = useState<TabBeat[]>([])   // range beat clipboard
  const [ctxMenu, setCtxMenu]     = useState<CtxMenu | null>(null)
  const [chordInput, setChordInput] = useState('')  // controlled input for chord name

  const containerRef = useRef<HTMLDivElement>(null)
  const sheetRef     = useRef<HTMLDivElement>(null)
  const printRef     = useRef<HTMLDivElement>(null)   // off-screen print layout
  const importRef    = useRef<HTMLInputElement>(null) // hidden file input
  const pendTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historyRef   = useRef<TabSong[]>([])

  /** Rows pre-computed for the print layout at PRINT_W width */
  const printRows = useMemo(() => computePrintRows(song.measures), [song.measures])

  useEffect(() => { upsertSong(song) }, [song])
  useEffect(() => { if (visible) setTimeout(() => containerRef.current?.focus(), 50) }, [visible])
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  // Sync chord input with selected beat
  useEffect(() => {
    const beat = cursor ? song.measures[cursor.measureIdx]?.beats[cursor.beatIdx] : null
    setChordInput(beat?.chord ?? '')
  }, [cursor, song])

  // ── History ───────────────────────────────────────────────────────────────

  function pushHistory(p: TabSong) { historyRef.current = [...historyRef.current.slice(-39), p] }
  function undo() {
    const h = historyRef.current; if (!h.length) return
    setSong(h[h.length - 1]); historyRef.current = h.slice(0, -1)
  }

  // ── Core mutation ─────────────────────────────────────────────────────────

  function update(fn: (s: TabSong) => TabSong) {
    setSong(prev => { pushHistory(prev); return fn({ ...prev, updatedAt: Date.now() }) })
  }
  function updateBeat(mi: number, bi: number, fn: (b: TabBeat) => TabBeat) {
    update(s => ({
      ...s,
      measures: s.measures.map((m, i) => i !== mi ? m : {
        ...m,
        beats: m.beats.map((b, j) => j !== bi ? b : fn(b)),
      }),
    }))
  }
  function updateCell(mi: number, bi: number, si: number, fn: (c: TabCell) => TabCell) {
    updateBeat(mi, bi, b => ({
      ...b,
      cells: b.cells.map((c, k) => k !== si ? c : fn(c)) as [TabCell, TabCell, TabCell, TabCell],
    }))
  }

  // ── Specific mutations ────────────────────────────────────────────────────

  function toggleTech(field: 'preTech' | 'postTech', value: string, mi_ = cursor?.measureIdx, bi_ = cursor?.beatIdx, si_ = cursor?.stringIdx) {
    if (mi_ === undefined || bi_ === undefined || si_ === undefined) return
    updateCell(mi_, bi_, si_, c => ({ ...c, [field]: c[field] === value ? '' : value }))
  }
  function toggleCellBool(field: 'isDead' | 'isGhost' | 'isPM', mi_ = cursor?.measureIdx, bi_ = cursor?.beatIdx, si_ = cursor?.stringIdx) {
    if (mi_ === undefined || bi_ === undefined || si_ === undefined) return
    if (field === 'isDead') {
      updateCell(mi_, bi_, si_, c => ({ ...c, isDead: !c.isDead, fret: null, preTech: '', postTech: '' }))
    } else {
      updateCell(mi_, bi_, si_, c => ({ ...c, [field]: !(c[field] ?? false) }))
    }
  }
  function setDuration(dur: Duration, mi_ = cursor?.measureIdx, bi_ = cursor?.beatIdx) {
    if (mi_ === undefined || bi_ === undefined) return
    updateBeat(mi_, bi_, b => ({ ...b, duration: dur }))
  }
  function toggleDotted(mi_ = cursor?.measureIdx, bi_ = cursor?.beatIdx) {
    if (mi_ === undefined || bi_ === undefined) return
    updateBeat(mi_, bi_, b => ({ ...b, dotted: !(b.dotted ?? false) }))
  }
  function toggleRest(mi_ = cursor?.measureIdx, bi_ = cursor?.beatIdx) {
    if (mi_ === undefined || bi_ === undefined) return
    updateBeat(mi_, bi_, b => ({ ...b, isRest: !(b.isRest ?? false) }))
  }
  function setChord(chord: string, mi_ = cursor?.measureIdx, bi_ = cursor?.beatIdx) {
    if (mi_ === undefined || bi_ === undefined) return
    updateBeat(mi_, bi_, b => ({ ...b, chord }))
  }
  function setArticulation(art: Articulation, mi_ = cursor?.measureIdx, bi_ = cursor?.beatIdx, si_ = cursor?.stringIdx) {
    if (mi_ === undefined || bi_ === undefined || si_ === undefined) return
    updateCell(mi_, bi_, si_, c => ({ ...c, articulation: (c.articulation ?? '') === art ? '' : art }))
  }

  // Transpose all frets in selection (or current cell) by semitones
  function transpose(delta: number) {
    if (!cursor) return
    const mi = cursor.measureIdx
    const lo = selRange?.mi === mi ? Math.min(selRange.bi0, selRange.bi1) : cursor.beatIdx
    const hi = selRange?.mi === mi ? Math.max(selRange.bi0, selRange.bi1) : cursor.beatIdx
    update(s => ({
      ...s,
      measures: s.measures.map((m, i) => i !== mi ? m : {
        ...m,
        beats: m.beats.map((b, bi) => {
          if (bi < lo || bi > hi) return b
          return {
            ...b,
            cells: b.cells.map(c => c.fret === null ? c : {
              ...c,
              fret: Math.max(0, Math.min(24, c.fret + delta)),
            }) as [TabCell, TabCell, TabCell, TabCell],
          }
        }),
      }),
    }))
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  function handleCellClick(mi: number, bi: number, si: number, shift: boolean) {
    containerRef.current?.focus()
    if (shift && cursor && cursor.measureIdx === mi) {
      setSelRange({ mi, bi0: cursor.beatIdx, bi1: bi })
    } else {
      setSelRange(null)
      setCursor({ measureIdx: mi, beatIdx: bi, stringIdx: si })
    }
  }
  function handleBeatClick(mi: number, bi: number, shift: boolean) {
    containerRef.current?.focus()
    if (shift && cursor && cursor.measureIdx === mi) {
      setSelRange({ mi, bi0: cursor.beatIdx, bi1: bi })
    } else {
      setSelRange(null)
      setCursor(cur => cur ? { ...cur, measureIdx: mi, beatIdx: bi } : { measureIdx: mi, beatIdx: bi, stringIdx: 0 })
    }
  }

  function deleteSelection() {
    if (!selRange) return
    const { mi, bi0, bi1 } = selRange
    const lo = Math.min(bi0, bi1), hi = Math.max(bi0, bi1)
    update(s => ({
      ...s,
      measures: s.measures.map((m, i) => i !== mi ? m : {
        ...m,
        beats: m.beats.map((b, bi) => bi >= lo && bi <= hi ? emptyBeat() : b),
      }),
    }))
  }
  function copySelection() {
    if (!selRange || !cursor) return
    const { mi, bi0, bi1 } = selRange
    const lo = Math.min(bi0, bi1), hi = Math.max(bi0, bi1)
    setBeatClip(deepCopy(song.measures[mi].beats.slice(lo, hi + 1)))
  }
  function pasteBeats() {
    if (!beatClip.length || !cursor) return
    const mi = cursor.measureIdx, bi = cursor.beatIdx
    update(s => ({
      ...s,
      measures: s.measures.map((m, i) => {
        if (i !== mi) return m
        const newBeats = [...m.beats]
        const pasted = beatClip.map(b => ({ ...deepCopy(b), id: uid() }))
        newBeats.splice(bi + 1, 0, ...pasted)
        return { ...m, beats: newBeats }
      }),
    }))
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function moveCursor(dBeat: number, dStr: number, shift = false) {
    setCursor(cur => {
      if (!cur) return cur
      const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cur
      const newSi = Math.max(0, Math.min(3, si + dStr))
      if (dBeat === 0) return { ...cur, stringIdx: newSi }
      const m = song.measures[mi], nbi = bi + dBeat
      let next: Cursor
      if (nbi >= 0 && nbi < m.beats.length) next = { ...cur, beatIdx: nbi, stringIdx: newSi }
      else if (dBeat > 0 && mi + 1 < song.measures.length) next = { measureIdx: mi + 1, beatIdx: 0, stringIdx: si }
      else if (dBeat < 0 && mi > 0) { const p = song.measures[mi - 1]; next = { measureIdx: mi - 1, beatIdx: p.beats.length - 1, stringIdx: si } }
      else next = cur
      if (shift && next !== cur) {
        setSelRange(prev => {
          const anchorBi = prev?.bi0 ?? cur.beatIdx
          return next.measureIdx === mi ? { mi, bi0: anchorBi, bi1: next.beatIdx } : null
        })
      } else if (!shift) {
        setSelRange(null)
      }
      return next
    })
  }

  // ── Fret entry ────────────────────────────────────────────────────────────

  function commitFret(str: string) {
    if (!cursor) return
    const fret = parseInt(str, 10)
    if (isNaN(fret) || fret < 0 || fret > 24) return
    const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor
    // If beat is a rest, clear it first
    if (song.measures[mi]?.beats[bi]?.isRest) {
      updateBeat(mi, bi, b => ({ ...b, isRest: false }))
    }
    updateCell(mi, bi, si, c => ({ ...c, fret, isDead: false }))
    moveCursor(1, 0)
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

    if (e.key === 'Escape') { setCtxMenu(null); setSelRange(null); setCursor(null); return }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') { e.preventDefault(); undo(); return }
      if (e.key === 'a' && cursor) {
        e.preventDefault()
        const m = song.measures[cursor.measureIdx]
        setSelRange({ mi: cursor.measureIdx, bi0: 0, bi1: m.beats.length - 1 }); return
      }
      if (e.key === 'c') {
        e.preventDefault()
        if (selRange) { copySelection(); return }
        if (cursor) { const m = song.measures[cursor.measureIdx]; if (m) setClipboard(deepCopy(m)) }
        return
      }
      if (e.key === 'v') {
        e.preventDefault()
        if (beatClip.length) { pasteBeats(); return }
        if (cursor && clipboard) {
          const mi = cursor.measureIdx, newM = { ...deepCopy(clipboard), id: uid() }
          update(s => ({ ...s, measures: [...s.measures.slice(0, mi + 1), newM, ...s.measures.slice(mi + 1)] }))
        }
        return
      }
    }

    if (!cursor) return

    // Fret digits
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      if (pendTimer.current) clearTimeout(pendTimer.current)
      const combined = pendingDigit + e.key, num = parseInt(combined, 10)
      if (pendingDigit && num <= 24) { setPending(''); commitFret(combined) }
      else { setPending(e.key); pendTimer.current = setTimeout(() => { setPending(''); commitFret(e.key) }, 700) }
      return
    }
    if (pendingDigit) { if (pendTimer.current) clearTimeout(pendTimer.current); commitFret(pendingDigit); setPending('') }

    const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor
    switch (e.key) {
      case 'Backspace': case 'Delete':
        e.preventDefault()
        if (selRange) { deleteSelection(); setSelRange(null) }
        else updateCell(mi, bi, si, () => emptyCell())
        break
      case 'Tab':        e.preventDefault(); moveCursor(1, 0); break
      case 'ArrowRight': e.preventDefault(); moveCursor(1, 0, e.shiftKey); break
      case 'ArrowLeft':  e.preventDefault(); moveCursor(-1, 0, e.shiftKey); break
      case 'ArrowUp':    e.preventDefault(); moveCursor(0, -1); break
      case 'ArrowDown':  e.preventDefault(); moveCursor(0, 1);  break
      case '/':  e.preventDefault(); toggleTech('preTech', '/');   break
      case '\\': e.preventDefault(); toggleTech('preTech', '\\');  break
      case 'h':  e.preventDefault(); toggleTech('preTech', 'h');   break
      case 'p':  e.preventDefault(); toggleTech('preTech', 'p');   break
      case 'b':  e.preventDefault(); toggleTech('postTech', 'b');  break
      case '~':  e.preventDefault(); toggleTech('postTech', '~');  break
      case 'x':  e.preventDefault(); toggleCellBool('isDead');     break
      case '(':  e.preventDefault(); toggleCellBool('isGhost');    break
      case 'm':  e.preventDefault(); toggleCellBool('isPM');       break
      case 'r':  e.preventDefault(); toggleRest();                 break
      case '.':  e.preventDefault(); toggleDotted();               break
      case 's':  e.preventDefault(); setArticulation('S');         break
      case 't':  e.preventDefault(); setArticulation('T');         break
      case '+':  e.preventDefault(); transpose(1);                 break
      case '-':  e.preventDefault(); transpose(-1);                break
      // Duration (Shift+letter)
      case 'W':  e.preventDefault(); setDuration('w'); break
      case 'H':  e.preventDefault(); setDuration('h'); break
      case 'Q':  e.preventDefault(); setDuration('q'); break
      case 'E':  e.preventDefault(); setDuration('e'); break
      case 'S':  e.preventDefault(); setDuration('s'); break
    }
  }

  // ── Measure / beat ops ────────────────────────────────────────────────────

  function addMeasure() { update(s => ({ ...s, measures: [...s.measures, emptyMeasure(s.timeSignature[0])] })) }
  function deleteMeasure() {
    if (song.measures.length <= 1) return
    const mi = cursor?.measureIdx ?? song.measures.length - 1
    update(s => ({ ...s, measures: s.measures.filter((_, i) => i !== mi) })); setCursor(null); setSelRange(null)
  }
  function addBeat() {
    if (!cursor) return; const mi = cursor.measureIdx
    update(s => ({ ...s, measures: s.measures.map((m, i) => i !== mi ? m : { ...m, beats: [...m.beats, emptyBeat()] }) }))
  }
  function addRestBeat() {
    if (!cursor) return; const mi = cursor.measureIdx
    const dur = cursor ? beatDur(song.measures[mi]?.beats[cursor.beatIdx]) : 'q'
    update(s => ({ ...s, measures: s.measures.map((m, i) => i !== mi ? m : { ...m, beats: [...m.beats, restBeat(dur)] }) }))
  }
  function removeBeat() {
    if (!cursor) return; const mi = cursor.measureIdx, m = song.measures[mi]
    if (m.beats.length <= 1) return
    update(s => ({ ...s, measures: s.measures.map((m, i) => i !== mi ? m : { ...m, beats: m.beats.slice(0, -1) }) }))
    setCursor(c => c ? { ...c, beatIdx: Math.min(c.beatIdx, m.beats.length - 2) } : null)
  }
  function toggleRepeat(side: 'repeatStart' | 'repeatEnd') {
    if (!cursor) return; const mi = cursor.measureIdx
    update(s => ({ ...s, measures: s.measures.map((m, i) => i !== mi ? m : { ...m, [side]: !m[side] }) }))
  }
  function setSection(val: string) {
    if (!cursor) return; const mi = cursor.measureIdx
    update(s => ({ ...s, measures: s.measures.map((m, i) => i !== mi ? m : { ...m, section: val }) }))
  }

  // ── Context menu ──────────────────────────────────────────────────────────

  function handleCellContextMenu(mi: number, bi: number, si: number, x: number, y: number) {
    setCursor({ measureIdx: mi, beatIdx: bi, stringIdx: si })
    setCtxMenu({ screenX: x, screenY: y, measureIdx: mi, beatIdx: bi, stringIdx: si })
  }

  // ── Print / PDF ───────────────────────────────────────────────────────────
  // Uses the off-screen printRef container (rendered at PRINT_W, auto row-packed)
  // so the PDF always shows all measures, not just the visible viewport.

  function handlePrint() {
    const container = printRef.current
    if (!container) return

    const svgBlocks = Array.from(container.querySelectorAll('svg')).map(svg => {
      const clone = svg.cloneNode(true) as SVGElement
      // Remove interactive artifacts
      clone.querySelectorAll('[data-cursor="true"]').forEach(n => n.remove())
      clone.querySelectorAll('rect[fill="transparent"]').forEach(n => n.remove())
      // Clamp width to print width and set viewBox for scaling
      const rawW = parseInt(clone.getAttribute('width') || String(PRINT_W))
      clone.setAttribute('viewBox', `0 0 ${rawW} ${SVG_H}`)
      clone.setAttribute('width',  String(Math.min(rawW, PRINT_W)))
      clone.setAttribute('height', String(SVG_H))
      return clone.outerHTML
    })

    const w = window.open('', '_blank', 'width=960,height=800')
    if (!w) { alert('Permitir ventanas emergentes para exportar PDF.'); return }

    w.document.write(`<!DOCTYPE html><html lang="es"><head>
<meta charset="utf-8"/><title>${song.title || 'Tab'} — BassTheory</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#fff;color:#111;font-family:'Courier New',monospace;
       padding:28px 30px;max-width:${PRINT_W + 60}px;margin:0 auto}
  h1{font-size:22px;font-weight:900;margin-bottom:2px;letter-spacing:-0.5px}
  .meta{font-size:11px;color:#555;margin-bottom:24px;
        border-bottom:1px solid #ccc;padding-bottom:8px}
  .row{margin-bottom:14px;page-break-inside:avoid}
  /* Force dark SVG elements to print black */
  svg line{stroke:#222!important}
  svg text{fill:#111!important}
  svg ellipse[fill="#9ca3af"]{fill:#333!important}
  svg ellipse[fill="none"]{fill:none!important;stroke:#333!important}
  svg path{stroke:#333!important;fill:none!important}
  svg rect:not([data-cursor]){fill:#333!important}
  svg circle{fill:#555!important}
  @media print{
    body{padding:10px 14px}
    @page{margin:14mm 12mm}
  }
</style></head><body>
<h1>${song.title || 'Sin título'}</h1>
<div class="meta">${song.artist ? `<strong>${song.artist}</strong>&nbsp;·&nbsp;` : ''}&#9833;&nbsp;=&nbsp;${song.tempo}&nbsp;BPM &nbsp;·&nbsp; ${song.timeSignature[0]}/${song.timeSignature[1]} &nbsp;·&nbsp; <strong>${song.key}</strong></div>
${svgBlocks.map(s => `<div class="row">${s}</div>`).join('\n')}
<script>window.onload=function(){window.print()}</script>
</body></html>`)
    w.document.close()
  }

  // ── Export / Import JSON ──────────────────────────────────────────────────

  function exportSong() {
    const json = JSON.stringify(song, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${(song.title || 'tab').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}.basst`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const raw = JSON.parse(ev.target?.result as string) as TabSong
        if (!raw.measures || !Array.isArray(raw.measures)) throw new Error('no measures')
        // Migrate: fill missing fields introduced in newer versions
        const migrated: TabSong = {
          ...newSong(),
          ...raw,
          id: uid(),
          updatedAt: Date.now(),
          measures: raw.measures.map(m => ({
            id: m.id || uid(),
            repeatStart: m.repeatStart ?? false,
            repeatEnd:   m.repeatEnd   ?? false,
            section:     m.section     ?? '',
            beats: (m.beats || []).map(b => ({
              ...emptyBeat(),
              ...b,
              cells: ((b.cells || []) as TabCell[]).map(c => ({
                ...emptyCell(), ...c,
              })) as [TabCell, TabCell, TabCell, TabCell],
            })),
          })),
        }
        setSong(migrated)
        upsertSong(migrated)
        setCursor(null)
        setSelRange(null)
      } catch {
        alert('Archivo inválido. Debe ser un .basst exportado desde BassTheory.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''  // allow re-importing same file
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const selCell    = cursor ? song.measures[cursor.measureIdx]?.beats[cursor.beatIdx]?.cells[cursor.stringIdx] : null
  const selBeat    = cursor ? song.measures[cursor.measureIdx]?.beats[cursor.beatIdx] : null
  const selMeasure = cursor ? song.measures[cursor.measureIdx] : null
  const selDur     = selBeat ? beatDur(selBeat) : 'q'
  const rows = chunk(song.measures.map((m, i) => ({ measure: m, globalIdx: i })), measPerRow)
  const hasSelection = selRange !== null

  const TECH_BTNS = [
    { label: '/ Slide↑', f: 'preTech' as const, v: '/' },
    { label: '\\ Slide↓', f: 'preTech' as const, v: '\\' },
    { label: 'h Hammer', f: 'preTech' as const, v: 'h' },
    { label: 'p Pull', f: 'preTech' as const, v: 'p' },
    { label: 'b Bend', f: 'postTech' as const, v: 'b' },
    { label: '~ Vibrato', f: 'postTech' as const, v: '~' },
  ]

  if (!visible) return null

  return (
    <>
      <style>{`
        .tab-cursor-blink{animation:tabBlink 1s step-end infinite}
        @keyframes tabBlink{0%,100%{opacity:1}50%{opacity:0}}
      `}</style>

      {showLib && <SongLibrary currentId={song.id} onLoad={s => { setSong(s); setCursor(null); setSelRange(null) }} onClose={() => setShowLib(false)} />}

      {ctxMenu && (
        <ContextMenu
          menu={ctxMenu} song={song} cursor={cursor}
          onTechToggle={(f, v) => toggleTech(f, v, ctxMenu.measureIdx, ctxMenu.beatIdx, ctxMenu.stringIdx)}
          onSetDuration={d => setDuration(d, ctxMenu.measureIdx, ctxMenu.beatIdx)}
          onCellToggle={field => toggleCellBool(field, ctxMenu.measureIdx, ctxMenu.beatIdx, ctxMenu.stringIdx)}
          onToggleRest={() => toggleRest(ctxMenu.measureIdx, ctxMenu.beatIdx)}
          onToggleDotted={() => toggleDotted(ctxMenu.measureIdx, ctxMenu.beatIdx)}
          onSetArticulation={art => setArticulation(art, ctxMenu.measureIdx, ctxMenu.beatIdx, ctxMenu.stringIdx)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-hidden focus:outline-none"
        tabIndex={-1} ref={containerRef} onKeyDown={handleKeyDown}>

        {/* ── Header ── */}
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-2 flex-wrap">
          <span className="font-black text-amber-400 mr-1">🎸 Editor de Tabs</span>
          <button onClick={() => setShowLib(true)} className="px-2.5 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">📂 Mis Tabs</button>
          <button onClick={() => { if (!confirm('¿Nueva tablatura?')) return; const s = newSong(); setSong(s); setCursor(null); setSelRange(null) }}
            className="px-2.5 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">+ Nueva</button>

          <div className="h-4 w-px bg-gray-700" />

          {/* Export / Import */}
          <button onClick={exportSong} title="Exportar como archivo .basst (para llevar a otra PC)"
            className="px-2.5 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-teal-900/50 hover:text-teal-300 transition-colors">
            ⬇ Exportar
          </button>
          <button onClick={() => importRef.current?.click()} title="Importar archivo .basst"
            className="px-2.5 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-teal-900/50 hover:text-teal-300 transition-colors">
            ⬆ Importar
          </button>
          {/* Hidden file input for import */}
          <input ref={importRef} type="file" accept=".basst,.json" className="hidden"
            onChange={handleImportFile} />

          <div className="flex-1" />
          {hasSelection && <span className="text-blue-400 text-xs">📌 {Math.abs((selRange?.bi1 ?? 0) - (selRange?.bi0 ?? 0)) + 1} beats sel.</span>}
          <button onClick={handlePrint} title="Generar PDF con todos los compases"
            className="px-2.5 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">🖨️ PDF</button>
          <button onClick={onClose} className="ml-1 w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-300 text-lg">✕</button>
        </div>

        {/* ── Song metadata ── */}
        <div className="flex-shrink-0 bg-gray-900/50 border-b border-gray-800 px-4 py-2 flex flex-wrap items-center gap-3">
          <input type="text" value={song.title} onChange={e => update(s => ({ ...s, title: e.target.value }))}
            placeholder="Título" className="bg-transparent text-white font-black text-lg focus:outline-none border-b-2 border-transparent focus:border-amber-400 transition-colors placeholder:text-gray-700 w-48" />
          <input type="text" value={song.artist} onChange={e => update(s => ({ ...s, artist: e.target.value }))}
            placeholder="Artista" className="bg-transparent text-gray-400 text-sm focus:outline-none border-b border-transparent focus:border-gray-500 transition-colors placeholder:text-gray-700 w-32" />
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-xs">♩=</span>
            <button onClick={() => update(s => ({ ...s, tempo: Math.max(40, s.tempo - 5) }))} className="w-5 h-5 flex items-center justify-center rounded bg-gray-800 text-gray-400 hover:bg-gray-700 text-xs">−</button>
            <input type="number" value={song.tempo} min={40} max={300} onChange={e => update(s => ({ ...s, tempo: Number(e.target.value) || s.tempo }))}
              className="w-12 bg-gray-800/50 text-white text-sm text-center rounded focus:outline-none px-1" />
            <button onClick={() => update(s => ({ ...s, tempo: Math.min(300, s.tempo + 5) }))} className="w-5 h-5 flex items-center justify-center rounded bg-gray-800 text-gray-400 hover:bg-gray-700 text-xs">+</button>
            <span className="text-gray-500 text-xs">BPM</span>
          </div>
          <select value={`${song.timeSignature[0]}/${song.timeSignature[1]}`}
            onChange={e => { const [n, d] = e.target.value.split('/').map(Number); update(s => ({ ...s, timeSignature: [n, d] as [number, number] })) }}
            className="bg-gray-800 text-white text-sm rounded px-2 py-0.5 focus:outline-none">
            {TIME_SIGS.map(ts => <option key={ts} value={ts}>{ts}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-xs">Ton:</span>
            <select value={song.key} onChange={e => update(s => ({ ...s, key: e.target.value }))}
              className="bg-gray-800 text-white text-sm rounded px-2 py-0.5 focus:outline-none">
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex-shrink-0 border-b border-gray-800 px-3 py-1.5 flex items-center gap-1.5 flex-wrap text-xs bg-gray-900/30 min-h-[36px]">
          {/* Measure ops */}
          <button onClick={addMeasure} className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700">+ Compás</button>
          <button onClick={deleteMeasure} disabled={song.measures.length <= 1} className="px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30">− Compás</button>

          {cursor && <>
            <div className="h-4 w-px bg-gray-700" />
            {/* Beat ops */}
            <button onClick={addBeat} className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700">+ Tiempo</button>
            <button onClick={addRestBeat} title="Agregar silencio" className={`px-2 py-1 rounded font-mono hover:bg-gray-700 transition-colors bg-gray-800 text-gray-300`}>+ 𝄽</button>
            <button onClick={removeBeat} className="px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700">− Tiempo</button>

            {/* Selection ops */}
            {hasSelection && <>
              <button onClick={deleteSelection} title="Borrar selección" className="px-2 py-1 rounded bg-red-900/40 text-red-400 hover:bg-red-800/50">Borrar sel.</button>
              <button onClick={() => { copySelection(); }} title="Copiar beats (Ctrl+C)" className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700">Copiar</button>
            </>}
            {beatClip.length > 0 && (
              <button onClick={pasteBeats} title="Pegar beats" className="px-2 py-1 rounded bg-gray-800 text-amber-400 hover:bg-gray-700">Pegar ({beatClip.length})</button>
            )}

            <div className="h-4 w-px bg-gray-700" />

            {/* Section */}
            <select value={selMeasure?.section ?? ''} onChange={e => setSection(e.target.value)}
              className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none">
              <option value="">Sección…</option>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Repeat */}
            <button onClick={() => toggleRepeat('repeatStart')}
              className={`px-2 py-1 rounded font-mono font-bold transition-colors ${selMeasure?.repeatStart ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>|:</button>
            <button onClick={() => toggleRepeat('repeatEnd')}
              className={`px-2 py-1 rounded font-mono font-bold transition-colors ${selMeasure?.repeatEnd ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>:|</button>

            <div className="h-4 w-px bg-gray-700" />

            {/* Rest + Dotted */}
            <button onClick={() => toggleRest()} title="Silencio (r)"
              className={`px-2 py-1 rounded transition-colors font-mono ${selBeat?.isRest ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>𝄽</button>
            <button onClick={() => toggleDotted()} title="Puntillo (.)"
              className={`px-2 py-1 rounded transition-colors ${selBeat?.dotted ? 'bg-orange-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>·</button>

            {/* Duration */}
            {DURATION_ORDER.map(d => {
              const { symbol, label } = DURATION_INFO[d]
              return (
                <button key={d} onClick={() => setDuration(d)} title={label}
                  className={`px-2 py-1 rounded transition-colors text-sm ${selDur === d ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {symbol}
                </button>
              )
            })}

            <div className="h-4 w-px bg-gray-700" />

            {/* Articulation (bass) */}
            {(['S', 'P', 'T'] as Articulation[]).map(art => {
              const { label, color } = ARTICULATION_INFO[art]
              const active = (selCell?.articulation ?? '') === art
              return (
                <button key={art} onClick={() => setArticulation(art)} title={label}
                  style={active ? { backgroundColor: color + '33', color } : {}}
                  className={`px-2 py-1 rounded font-bold transition-colors text-xs ${active ? 'ring-1' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  onMouseEnter={e => { if (!active) (e.target as HTMLElement).style.color = color }}
                  onMouseLeave={e => { if (!active) (e.target as HTMLElement).style.color = '' }}>
                  {art}
                </button>
              )
            })}

            <div className="h-4 w-px bg-gray-700" />

            {/* Techniques */}
            {TECH_BTNS.map(({ label, f, v }) => (
              <button key={v} onClick={() => toggleTech(f, v)}
                className={`px-2 py-1 rounded font-mono transition-colors ${selCell?.[f] === v ? 'bg-teal-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                {label}
              </button>
            ))}
            <button onClick={() => toggleCellBool('isDead')}
              className={`px-2 py-1 rounded font-mono transition-colors ${selCell?.isDead ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>x</button>
            <button onClick={() => toggleCellBool('isGhost')}
              className={`px-2 py-1 rounded font-mono transition-colors ${selCell?.isGhost ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>( )</button>
            <button onClick={() => toggleCellBool('isPM')}
              className={`px-2 py-1 rounded font-mono transition-colors ${selCell?.isPM ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>PM</button>

            <div className="h-4 w-px bg-gray-700" />

            {/* Transpose */}
            <span className="text-gray-600">±st:</span>
            <button onClick={() => transpose(1)} title="Subir semitono (+)" className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700">+1</button>
            <button onClick={() => transpose(-1)} title="Bajar semitono (-)" className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700">-1</button>

            <div className="h-4 w-px bg-gray-700" />

            {/* Chord name */}
            <span className="text-gray-600">🎵</span>
            <input
              type="text"
              value={chordInput}
              onChange={e => setChordInput(e.target.value)}
              onBlur={e => setChord(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setChord(chordInput); containerRef.current?.focus() } }}
              placeholder="Acorde…"
              list="chord-list"
              className="w-20 bg-gray-800 text-amber-300 text-xs rounded px-2 py-1 focus:outline-none placeholder:text-gray-700 font-medium italic"
            />
            <datalist id="chord-list">
              {COMMON_CHORDS.map(c => <option key={c} value={c} />)}
            </datalist>
          </>}

          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <span className="text-gray-700 hidden sm:block">Fila:</span>
            {[2, 3, 4, 6].map(n => (
              <button key={n} onClick={() => setMPR(n)}
                className={`w-6 h-6 rounded text-xs transition-colors ${measPerRow === n ? 'bg-teal-700 text-white' : 'bg-gray-800 text-gray-600 hover:bg-gray-700'}`}>{n}</button>
            ))}
          </div>
          {pendingDigit && <span className="text-amber-400 font-mono ml-2 tabular-nums">Traste: {pendingDigit}…</span>}
        </div>

        {/* ── Tab sheet ── */}
        <div className="flex-1 overflow-auto p-6">
          <div className="text-center mb-6">
            <p className="text-white font-black text-2xl leading-tight">{song.title || 'Sin título'}</p>
            {song.artist && <p className="text-gray-400 text-sm mt-1">{song.artist}</p>}
            <p className="text-gray-600 text-xs mt-1">♩ = {song.tempo} BPM · {song.timeSignature[0]}/{song.timeSignature[1]} · {song.key}</p>
          </div>

          <div ref={sheetRef} className="flex flex-col gap-5">
            {rows.map((row, ri) => (
              <div key={ri} className="overflow-x-auto">
                <TabRowSvg
                  entries={row} cursor={cursor} selRange={selRange}
                  timeSignature={song.timeSignature} tempo={song.tempo} isFirstRow={ri === 0}
                  onCellClick={handleCellClick}
                  onBeatClick={handleBeatClick}
                  onCellContextMenu={handleCellContextMenu}
                />
              </div>
            ))}
          </div>

          {!cursor && (
            <p className="mt-8 text-center text-gray-700 text-xs">
              Click para editar · Shift+Click/→ para seleccionar · Click derecho para opciones · Ctrl+Z deshacer
            </p>
          )}

          {/* Quick reference */}
          <div className="mt-10 border border-gray-800/70 rounded-xl p-4 max-w-2xl mx-auto bg-gray-900/30">
            <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-widest mb-3">Referencia rápida</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
              {[
                ['0–24',     'Traste'],
                ['Del',      'Borrar celda'],
                ['↑↓←→',    'Navegar'],
                ['Shift+←→', 'Seleccionar'],
                ['/ \\',    'Slide ↑ ↓'],
                ['h  p',     'Hammer / Pull'],
                ['b  ~',     'Bend / Vibrato'],
                ['x',        'Nota muerta'],
                ['(',        'Fantasma'],
                ['m',        'Palm Mute'],
                ['r',        'Silencio/Rest'],
                ['.',        'Puntillo'],
                ['s',        'Slap'],
                ['t',        'Tap'],
                ['+  -',     'Transponer ±st'],
                ['W H Q E S','Duración (Shift)'],
                ['Ctrl+A',   'Sel. compás'],
                ['Ctrl+C/V', 'Copiar/Pegar'],
                ['Ctrl+Z',   'Deshacer'],
                ['🖱️ Der.',  'Menú opciones'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <kbd className="font-mono bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 whitespace-nowrap">{k}</kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Off-screen print layout ────────────────────────────────────────────
          Rendered at PRINT_W px, measures auto-packed into rows.
          Invisible to the user but read by handlePrint to generate the PDF.
      ─────────────────────────────────────────────────────────────────────── */}
      <div ref={printRef} aria-hidden="true"
        style={{ position: 'fixed', left: '-9999px', top: 0, width: `${PRINT_W}px`, pointerEvents: 'none' }}>
        {printRows.map((row, ri) => (
          <div key={ri}>
            <TabRowSvg
              entries={row} cursor={null} selRange={null}
              timeSignature={song.timeSignature} tempo={song.tempo} isFirstRow={ri === 0}
              onCellClick={() => {}} onBeatClick={() => {}} onCellContextMenu={() => {}}
            />
          </div>
        ))}
      </div>
    </>
  )
}
