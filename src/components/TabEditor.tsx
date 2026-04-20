import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single cell = one string × one beat.
 * preTech: technique that connects FROM the previous note to this one (/, \, h, p)
 * postTech: technique that modifies this note or connects TO next (/, \, b, ~)
 */
interface TabCell {
  fret:     number | null  // null = empty (dash)
  isDead:   boolean        // x (muted/dead note)
  isGhost:  boolean        // (fret) — ghost/muted note shown in parens
  preTech:  string         // '', '/', '\', 'h', 'p'
  postTech: string         // '', '/', '\', 'b', '~'
}

interface TabBeat {
  id:    string
  cells: [TabCell, TabCell, TabCell, TabCell]  // index 0=G 1=D 2=A 3=E
}

interface TabMeasure {
  id:          string
  beats:       TabBeat[]
  repeatStart: boolean
  repeatEnd:   boolean
}

interface TabSong {
  id:            string
  title:         string
  artist:        string
  tempo:         number
  timeSignature: [number, number]   // [numerator, denominator]
  key:           string
  measures:      TabMeasure[]
  createdAt:     number
  updatedAt:     number
}

interface Cursor {
  measureIdx: number
  beatIdx:    number
  stringIdx:  number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STRING_LABELS   = ['G', 'D', 'A', 'E']
const BEAT_W          = 46    // px per beat column
const LABEL_W         = 24    // px for string label column (first measure only)
const STRING_SPACING  = 22    // px between string lines
const TOP_PAD         = 24    // y of first string
const BOT_PAD         = 16
const SVG_H           = TOP_PAD + STRING_SPACING * 3 + BOT_PAD  // 102 px
const STRING_Y        = Array.from({ length: 4 }, (_, i) => TOP_PAD + STRING_SPACING * i)

const KEYS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Gb', 'F', 'Bb', 'Eb', 'Ab', 'Db',
  'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm',
]

const TIME_SIGS = ['2/4', '3/4', '4/4', '5/4', '6/4', '6/8', '7/8', '12/8']

const STORAGE_KEY = 'basstheory-tabs'

// ─────────────────────────────────────────────────────────────────────────────
// Factory helpers
// ─────────────────────────────────────────────────────────────────────────────

let _seq = 0
function uid() { return `t${Date.now()}_${++_seq}` }

function emptyCell(): TabCell {
  return { fret: null, isDead: false, isGhost: false, preTech: '', postTech: '' }
}

function emptyBeat(): TabBeat {
  return { id: uid(), cells: [emptyCell(), emptyCell(), emptyCell(), emptyCell()] }
}

function emptyMeasure(beats = 4): TabMeasure {
  return {
    id: uid(),
    beats: Array.from({ length: beats }, emptyBeat),
    repeatStart: false,
    repeatEnd: false,
  }
}

function newSong(): TabSong {
  return {
    id: uid(),
    title: 'Sin título',
    artist: '',
    tempo: 120,
    timeSignature: [4, 4],
    key: 'Am',
    measures: Array.from({ length: 4 }, () => emptyMeasure()),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cell display text
// ─────────────────────────────────────────────────────────────────────────────

function cellText(c: TabCell): string {
  if (c.isDead) return 'x'
  if (c.fret === null) return ''
  const core = c.isGhost ? `(${c.fret})` : String(c.fret)
  return (c.preTech || '') + core + (c.postTech || '')
}

// ─────────────────────────────────────────────────────────────────────────────
// LocalStorage persistence
// ─────────────────────────────────────────────────────────────────────────────

function saveSong(song: TabSong) {
  try {
    const all = loadAllSongs()
    const idx = all.findIndex(s => s.id === song.id)
    if (idx >= 0) all[idx] = song
    else all.unshift(song)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch { /* storage full or unavailable */ }
}

function loadAllSongs(): TabSong[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TabSong[]) : []
  } catch { return [] }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab SVG renderer
// ─────────────────────────────────────────────────────────────────────────────

interface TabSvgProps {
  song:        TabSong
  cursor:      Cursor | null
  onCellClick: (mi: number, bi: number, si: number) => void
  svgRef?:     React.RefObject<SVGSVGElement>
}

function TabSvg({ song, cursor, onCellClick, svgRef }: TabSvgProps) {
  const { measures } = song

  // Width of each measure (label area only on first)
  const mWidths = measures.map((m, mi) =>
    (mi === 0 ? LABEL_W : 0) + BEAT_W * m.beats.length
  )

  // x start of each measure (each measure ends with a 2px barline gap)
  const mStartX: number[] = []
  let cx = 0
  for (let i = 0; i < measures.length; i++) {
    mStartX.push(cx)
    cx += mWidths[i] + 2
  }
  const totalW = cx + 4

  return (
    <svg
      ref={svgRef}
      width={totalW}
      height={SVG_H}
      style={{ fontFamily: 'monospace', userSelect: 'none', display: 'block' }}
    >
      {/* ── Full-width string lines ─────────────────────────────────────── */}
      {STRING_Y.map((y, si) => (
        <line key={si} x1={0} y1={y} x2={totalW} y2={y}
          stroke={si === 3 ? '#9ca3af' : '#6b7280'}
          strokeWidth={si === 3 ? 1.5 : 1}
        />
      ))}

      {/* ── Measures ───────────────────────────────────────────────────── */}
      {measures.map((measure, mi) => {
        const mx       = mStartX[mi]
        const lw       = mi === 0 ? LABEL_W : 0
        const beatX0   = mx + lw
        const beatAreaW = BEAT_W * measure.beats.length
        const barTop   = STRING_Y[0] - 8
        const barBot   = STRING_Y[3] + 8

        return (
          <g key={measure.id}>
            {/* String labels — first measure only */}
            {mi === 0 && STRING_Y.map((y, si) => (
              <text key={si} x={mx + 5} y={y}
                textAnchor="start" dominantBaseline="central"
                fontSize={11} fontWeight="bold" fill="#6b7280"
                style={{ pointerEvents: 'none' }}
              >
                {STRING_LABELS[si]}
              </text>
            ))}

            {/* Left barline */}
            <line
              x1={beatX0} y1={barTop} x2={beatX0} y2={barBot}
              stroke={measure.repeatStart ? '#f59e0b' : '#9ca3af'}
              strokeWidth={measure.repeatStart ? 3 : 2}
            />
            {measure.repeatStart && (
              <>
                <circle cx={beatX0 + 6} cy={STRING_Y[1]} r={2.5} fill="#f59e0b" />
                <circle cx={beatX0 + 6} cy={STRING_Y[2]} r={2.5} fill="#f59e0b" />
              </>
            )}

            {/* Beat columns */}
            {measure.beats.map((beat, bi) => {
              const bx = beatX0 + bi * BEAT_W
              return (
                <g key={beat.id}>
                  {STRING_Y.map((y, si) => {
                    const cell   = beat.cells[si]
                    const text   = cellText(cell)
                    const isCur  = cursor?.measureIdx === mi &&
                                   cursor?.beatIdx    === bi &&
                                   cursor?.stringIdx  === si

                    return (
                      <g key={si} onClick={() => onCellClick(mi, bi, si)} style={{ cursor: 'pointer' }}>
                        {/* Selection highlight */}
                        {isCur && (
                          <rect
                            x={bx + 2} y={y - 10}
                            width={BEAT_W - 4} height={20}
                            fill="#0d3d38" rx={3}
                            data-cursor="true"
                          />
                        )}

                        {/* Note content */}
                        {text ? (
                          <text
                            x={bx + BEAT_W / 2} y={y}
                            textAnchor="middle" dominantBaseline="central"
                            fontSize={text.length > 3 ? 9 : text.length > 2 ? 10 : 13}
                            fontWeight="700"
                            fill={
                              isCur ? '#2dd4bf'
                              : text === 'x' ? '#f87171'
                              : '#f1f5f9'
                            }
                            style={{ pointerEvents: 'none' }}
                          >
                            {text}
                          </text>
                        ) : isCur ? (
                          // Cursor blink on empty cell
                          <rect
                            x={bx + BEAT_W / 2 - 1} y={y - 7}
                            width={2} height={14}
                            fill="#2dd4bf" rx={1}
                            className="tab-cursor-blink"
                            data-cursor="true"
                          />
                        ) : null}

                        {/* Invisible click target */}
                        <rect
                          x={bx} y={y - 11}
                          width={BEAT_W} height={22}
                          fill="transparent"
                        />
                      </g>
                    )
                  })}
                </g>
              )
            })}

            {/* Right barline */}
            <line
              x1={beatX0 + beatAreaW} y1={barTop}
              x2={beatX0 + beatAreaW} y2={barBot}
              stroke={measure.repeatEnd ? '#f59e0b' : '#9ca3af'}
              strokeWidth={measure.repeatEnd ? 3 : 2}
            />
            {measure.repeatEnd && (
              <>
                <circle cx={beatX0 + beatAreaW - 6} cy={STRING_Y[1]} r={2.5} fill="#f59e0b" />
                <circle cx={beatX0 + beatAreaW - 6} cy={STRING_Y[2]} r={2.5} fill="#f59e0b" />
              </>
            )}

            {/* Measure number */}
            <text
              x={beatX0 + beatAreaW / 2} y={SVG_H - 3}
              textAnchor="middle" fontSize={8} fill="#374151"
              style={{ pointerEvents: 'none' }}
            >
              {mi + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main TabEditor component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean
  onClose: () => void
}

export default function TabEditor({ visible, onClose }: Props) {
  const [song, setSong]           = useState<TabSong>(() => {
    const saved = loadAllSongs()
    return saved.length > 0 ? saved[0] : newSong()
  })
  const [cursor, setCursor]       = useState<Cursor | null>(null)
  const [pendingDigit, setPending] = useState('')
  const containerRef              = useRef<HTMLDivElement>(null)
  const svgRef                    = useRef<SVGSVGElement>(null)
  const pendingTimer              = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save on change
  useEffect(() => { saveSong(song) }, [song])

  // Focus container when opened so keyboard works immediately
  useEffect(() => {
    if (visible) setTimeout(() => containerRef.current?.focus(), 50)
  }, [visible])

  // ── Mutation helpers ────────────────────────────────────────────────────────

  function update(fn: (s: TabSong) => TabSong) {
    setSong(s => fn({ ...s, updatedAt: Date.now() }))
  }

  function updateCell(mi: number, bi: number, si: number, fn: (c: TabCell) => TabCell) {
    update(song => ({
      ...song,
      measures: song.measures.map((m, i) => i !== mi ? m : {
        ...m,
        beats: m.beats.map((b, j) => j !== bi ? b : {
          ...b,
          cells: b.cells.map((c, k) => k !== si ? c : fn(c)) as [TabCell, TabCell, TabCell, TabCell],
        }),
      }),
    }))
  }

  function toggleTech(field: 'preTech' | 'postTech', value: string) {
    if (!cursor) return
    const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor
    updateCell(mi, bi, si, c => ({ ...c, [field]: c[field] === value ? '' : value }))
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  function moveCursor(dBeat: number, dString: number) {
    setCursor(cur => {
      if (!cur) return cur
      const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cur
      const newSi = Math.max(0, Math.min(3, si + dString))
      if (dBeat === 0) return { ...cur, stringIdx: newSi }

      const measure = song.measures[mi]
      const newBi   = bi + dBeat

      if (newBi >= 0 && newBi < measure.beats.length) {
        return { ...cur, beatIdx: newBi, stringIdx: newSi }
      }
      if (dBeat > 0 && mi + 1 < song.measures.length) {
        return { measureIdx: mi + 1, beatIdx: 0, stringIdx: si }
      }
      if (dBeat < 0 && mi > 0) {
        const prev = song.measures[mi - 1]
        return { measureIdx: mi - 1, beatIdx: prev.beats.length - 1, stringIdx: si }
      }
      return cur
    })
  }

  // ── Fret entry ──────────────────────────────────────────────────────────────

  function commitFret(fretStr: string) {
    if (!cursor) return
    const fret = parseInt(fretStr, 10)
    if (isNaN(fret) || fret < 0 || fret > 24) return
    const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor
    updateCell(mi, bi, si, c => ({ ...c, fret, isDead: false }))
    moveCursor(1, 0)
  }

  // ── Keyboard handler ────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!cursor) return

    // Digits — with 2-digit support (e.g., 12, 24)
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      if (pendingTimer.current) clearTimeout(pendingTimer.current)
      const combined = pendingDigit + e.key
      const num      = parseInt(combined, 10)

      if (pendingDigit && num <= 24) {
        // Two-digit fret complete
        setPending('')
        commitFret(combined)
      } else {
        // Wait for possible second digit
        setPending(e.key)
        pendingTimer.current = setTimeout(() => {
          setPending('')
          commitFret(e.key)
        }, 700)
      }
      return
    }

    // Flush any pending digit before handling other keys
    if (pendingDigit) {
      if (pendingTimer.current) clearTimeout(pendingTimer.current)
      commitFret(pendingDigit)
      setPending('')
    }

    const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor

    switch (e.key) {
      case 'Backspace':
      case 'Delete':
        e.preventDefault()
        updateCell(mi, bi, si, () => emptyCell())
        break
      case 'Tab':
      case 'ArrowRight':
        e.preventDefault(); moveCursor(1, 0); break
      case 'ArrowLeft':
        e.preventDefault(); moveCursor(-1, 0); break
      case 'ArrowUp':
        e.preventDefault(); moveCursor(0, -1); break
      case 'ArrowDown':
        e.preventDefault(); moveCursor(0, 1); break
      case '/':
        e.preventDefault(); toggleTech('preTech', '/'); break
      case '\\':
        e.preventDefault(); toggleTech('preTech', '\\'); break
      case 'h':
        e.preventDefault(); toggleTech('preTech', 'h'); break
      case 'p':
        e.preventDefault(); toggleTech('preTech', 'p'); break
      case 'b':
        e.preventDefault(); toggleTech('postTech', 'b'); break
      case '~':
        e.preventDefault(); toggleTech('postTech', '~'); break
      case 'x':
        e.preventDefault()
        updateCell(mi, bi, si, c => ({
          ...c, isDead: !c.isDead, fret: null, preTech: '', postTech: '',
        }))
        break
      case '(':
        e.preventDefault()
        updateCell(mi, bi, si, c => ({ ...c, isGhost: !c.isGhost }))
        break
      case 'Escape':
        setCursor(null); break
    }
  }

  // ── Measure / beat management ───────────────────────────────────────────────

  function addMeasure() {
    update(s => ({ ...s, measures: [...s.measures, emptyMeasure(s.timeSignature[0])] }))
  }

  function deleteMeasure() {
    if (song.measures.length <= 1) return
    const mi = cursor?.measureIdx ?? song.measures.length - 1
    update(s => ({ ...s, measures: s.measures.filter((_, i) => i !== mi) }))
    setCursor(null)
  }

  function addBeat() {
    if (!cursor) return
    const mi = cursor.measureIdx
    update(s => ({
      ...s,
      measures: s.measures.map((m, i) =>
        i !== mi ? m : { ...m, beats: [...m.beats, emptyBeat()] }
      ),
    }))
  }

  function removeBeat() {
    if (!cursor) return
    const mi = cursor.measureIdx
    const m  = song.measures[mi]
    if (m.beats.length <= 1) return
    update(s => ({
      ...s,
      measures: s.measures.map((m, i) =>
        i !== mi ? m : { ...m, beats: m.beats.slice(0, -1) }
      ),
    }))
    setCursor(c => c ? { ...c, beatIdx: Math.min(c.beatIdx, m.beats.length - 2) } : null)
  }

  function toggleRepeat(mi: number, side: 'repeatStart' | 'repeatEnd') {
    update(s => ({
      ...s,
      measures: s.measures.map((m, i) =>
        i !== mi ? m : { ...m, [side]: !m[side] }
      ),
    }))
  }

  // ── New song ────────────────────────────────────────────────────────────────

  function handleNewSong() {
    if (!confirm('¿Crear una nueva tablatura? Se perderán los cambios sin guardar.')) return
    const s = newSong()
    setSong(s)
    setCursor(null)
  }

  // ── PDF / Print export ──────────────────────────────────────────────────────

  function handlePrint() {
    const el = svgRef.current
    if (!el) return

    // Clone SVG and strip interactive elements (cursor highlight, click rects)
    const clone = el.cloneNode(true) as SVGElement
    clone.querySelectorAll('[data-cursor="true"]').forEach(n => n.remove())
    clone.querySelectorAll('rect[fill="transparent"]').forEach(n => n.remove())

    const w = window.open('', '_blank', 'width=960,height=700')
    if (!w) { alert('Bloqueó la ventana emergente. Permitila para exportar.'); return }

    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${song.title || 'Tab'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #fff; color: #000;
      font-family: 'Courier New', monospace;
      padding: 32px 40px;
    }
    h1 { font-size: 22px; margin-bottom: 3px; }
    .meta { font-size: 12px; color: #555; margin-bottom: 24px; }
    .tab-wrap { overflow-x: auto; }
    svg line  { stroke: #333 !important; }
    svg text  { fill: #000 !important; }
    svg circle { fill: #333 !important; }
    @media print {
      body { padding: 16px; }
    }
  </style>
</head>
<body>
  <h1>${song.title || 'Sin título'}</h1>
  <div class="meta">
    ${song.artist ? song.artist + ' &nbsp;·&nbsp; ' : ''}
    &#9833;=${song.tempo} BPM &nbsp;·&nbsp;
    ${song.timeSignature[0]}/${song.timeSignature[1]} &nbsp;·&nbsp;
    Ton: ${song.key}
  </div>
  <div class="tab-wrap">${clone.outerHTML}</div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`)
    w.document.close()
  }

  // ── Current selected cell ───────────────────────────────────────────────────

  const selCell = cursor
    ? song.measures[cursor.measureIdx]?.beats[cursor.beatIdx]?.cells[cursor.stringIdx]
    : null

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!visible) return null

  const TECH_BTNS: { label: string; field: 'preTech' | 'postTech'; value: string }[] = [
    { label: '/ Slide↑',   field: 'preTech',  value: '/'  },
    { label: '\\ Slide↓',  field: 'preTech',  value: '\\' },
    { label: 'h Hammer',   field: 'preTech',  value: 'h'  },
    { label: 'p Pull-off', field: 'preTech',  value: 'p'  },
    { label: 'b Bend',     field: 'postTech', value: 'b'  },
    { label: '~ Vibrato',  field: 'postTech', value: '~'  },
  ]

  return (
    <>
      <style>{`
        .tab-cursor-blink { animation: tabBlink 1s step-end infinite; }
        @keyframes tabBlink { 0%,100% { opacity:1 } 50% { opacity:0 } }
      `}</style>

      <div
        className="fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-hidden focus:outline-none"
        tabIndex={-1}
        ref={containerRef}
        onKeyDown={handleKeyDown}
      >

        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-3">
          <span className="font-black text-amber-400">🎸 Editor de Tabs</span>
          <div className="flex-1" />
          <button
            onClick={handleNewSong}
            className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Nueva
          </button>
          <button
            onClick={handlePrint}
            className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            🖨️ Exportar PDF
          </button>
          <button
            onClick={onClose}
            className="ml-1 text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* ── Song metadata ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-gray-900/50 border-b border-gray-800 px-4 py-2 flex flex-wrap items-center gap-4">
          <input
            type="text"
            value={song.title}
            onChange={e => update(s => ({ ...s, title: e.target.value }))}
            placeholder="Título"
            className="bg-transparent text-white font-black text-lg w-44 focus:outline-none border-b border-transparent focus:border-amber-400 transition-colors"
          />
          <input
            type="text"
            value={song.artist}
            onChange={e => update(s => ({ ...s, artist: e.target.value }))}
            placeholder="Artista"
            className="bg-transparent text-gray-400 text-sm w-36 focus:outline-none border-b border-transparent focus:border-gray-500 transition-colors"
          />

          <div className="h-4 w-px bg-gray-700" />

          {/* Tempo */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-xs">♩=</span>
            <button
              onClick={() => update(s => ({ ...s, tempo: Math.max(40, s.tempo - 5) }))}
              className="w-5 h-5 flex items-center justify-center rounded bg-gray-800 text-gray-400 hover:bg-gray-700 text-xs transition-colors"
            >−</button>
            <input
              type="number"
              value={song.tempo}
              min={40} max={300}
              onChange={e => update(s => ({ ...s, tempo: Number(e.target.value) || s.tempo }))}
              className="w-12 bg-transparent text-white text-sm text-center focus:outline-none"
            />
            <button
              onClick={() => update(s => ({ ...s, tempo: Math.min(300, s.tempo + 5) }))}
              className="w-5 h-5 flex items-center justify-center rounded bg-gray-800 text-gray-400 hover:bg-gray-700 text-xs transition-colors"
            >+</button>
            <span className="text-gray-500 text-xs">BPM</span>
          </div>

          {/* Time signature */}
          <select
            value={`${song.timeSignature[0]}/${song.timeSignature[1]}`}
            onChange={e => {
              const [n, d] = e.target.value.split('/').map(Number)
              update(s => ({ ...s, timeSignature: [n, d] as [number, number] }))
            }}
            className="bg-gray-800 text-white text-sm rounded px-2 py-0.5 focus:outline-none"
          >
            {TIME_SIGS.map(ts => <option key={ts} value={ts}>{ts}</option>)}
          </select>

          {/* Key */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-xs">Ton:</span>
            <select
              value={song.key}
              onChange={e => update(s => ({ ...s, key: e.target.value }))}
              className="bg-gray-800 text-white text-sm rounded px-2 py-0.5 focus:outline-none"
            >
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-gray-800 px-4 py-1.5 flex items-center gap-2 flex-wrap text-xs bg-gray-900/30">
          {/* Measure controls */}
          <span className="text-gray-600 font-semibold uppercase tracking-wider">Compás:</span>
          <button onClick={addMeasure}
            className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
            + Agregar
          </button>
          <button onClick={deleteMeasure} disabled={song.measures.length <= 1}
            className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 transition-colors">
            − Eliminar
          </button>

          {/* Beat controls — only when cursor active */}
          {cursor && (
            <>
              <button onClick={addBeat}
                className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
                + Tiempo
              </button>
              <button onClick={removeBeat}
                className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
                − Tiempo
              </button>

              {/* Repeat signs */}
              <button
                onClick={() => toggleRepeat(cursor.measureIdx, 'repeatStart')}
                className={`px-2 py-1 rounded transition-colors font-mono ${
                  song.measures[cursor.measureIdx]?.repeatStart
                    ? 'bg-amber-800 text-amber-200'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                |: Inicio rep.
              </button>
              <button
                onClick={() => toggleRepeat(cursor.measureIdx, 'repeatEnd')}
                className={`px-2 py-1 rounded transition-colors font-mono ${
                  song.measures[cursor.measureIdx]?.repeatEnd
                    ? 'bg-amber-800 text-amber-200'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                :| Fin rep.
              </button>

              <div className="h-4 w-px bg-gray-700 mx-1" />

              {/* Technique buttons */}
              <span className="text-gray-600 font-semibold uppercase tracking-wider">Técnica:</span>
              {TECH_BTNS.map(({ label, field, value }) => (
                <button
                  key={value}
                  onClick={() => toggleTech(field, value)}
                  className={`px-2 py-1 rounded transition-colors font-mono ${
                    selCell?.[field] === value
                      ? 'bg-teal-700 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}

              {/* Dead note */}
              <button
                onClick={() => {
                  if (!cursor) return
                  const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor
                  updateCell(mi, bi, si, c => ({
                    ...c, isDead: !c.isDead, fret: null, preTech: '', postTech: '',
                  }))
                }}
                className={`px-2 py-1 rounded transition-colors font-mono ${
                  selCell?.isDead
                    ? 'bg-red-800 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                x Muerta
              </button>

              {/* Ghost note */}
              <button
                onClick={() => {
                  if (!cursor) return
                  const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor
                  updateCell(mi, bi, si, c => ({ ...c, isGhost: !c.isGhost }))
                }}
                className={`px-2 py-1 rounded transition-colors font-mono ${
                  selCell?.isGhost
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                () Fantasma
              </button>
            </>
          )}

          <div className="flex-1" />

          {pendingDigit ? (
            <span className="text-amber-400 font-mono">Traste: {pendingDigit}…</span>
          ) : cursor ? (
            <span className="text-gray-700">
              ↑↓←→ navegar · 0–24 traste · Del borrar · / \ h p b ~ x técnicas · Esc salir
            </span>
          ) : null}
        </div>

        {/* ── Tab sheet ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-6">
          {/* Song header */}
          <div className="text-center mb-6">
            <p className="text-white font-black text-2xl">{song.title || 'Sin título'}</p>
            {song.artist && (
              <p className="text-gray-400 text-sm mt-1">{song.artist}</p>
            )}
            <p className="text-gray-600 text-xs mt-1">
              ♩={song.tempo} BPM &nbsp;·&nbsp;
              {song.timeSignature[0]}/{song.timeSignature[1]} &nbsp;·&nbsp;
              {song.key}
            </p>
          </div>

          {/* SVG tab */}
          <div className="overflow-x-auto pb-4">
            <TabSvg
              song={song}
              cursor={cursor}
              svgRef={svgRef}
              onCellClick={(mi, bi, si) => {
                setCursor({ measureIdx: mi, beatIdx: bi, stringIdx: si })
                containerRef.current?.focus()
              }}
            />
          </div>

          {!cursor && (
            <p className="mt-8 text-center text-gray-700 text-xs">
              Hacé click en cualquier punto del diapasón para empezar a editar
            </p>
          )}

          {/* Keyboard shortcuts reference */}
          <div className="mt-10 border border-gray-800 rounded-xl p-4 max-w-xl mx-auto">
            <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-3">Atajos de teclado</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">0–24</kbd> Ingresar traste</span>
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">Del</kbd> Borrar celda</span>
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">↑↓←→</kbd> Navegar</span>
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">Tab</kbd> Siguiente tiempo</span>
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">/</kbd> Slide up</span>
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">\</kbd> Slide down</span>
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">h</kbd> Hammer-on</span>
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">p</kbd> Pull-off</span>
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">b</kbd> Bend</span>
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">~</kbd> Vibrato</span>
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">x</kbd> Nota muerta</span>
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">(</kbd> Nota fantasma</span>
              <span><kbd className="font-mono bg-gray-800 px-1 rounded text-gray-400">Esc</kbd> Deseleccionar</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
