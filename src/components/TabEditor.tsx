import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TabCell {
  fret:     number | null  // null = empty
  isDead:   boolean        // x — muted/dead note
  isGhost:  boolean        // (fret) — parentheses
  preTech:  string         // '', '/', '\', 'h', 'p'
  postTech: string         // '', '/', '\', 'b', '~'
  isPM:     boolean        // palm mute — shows PM above note
}

interface TabBeat {
  id:    string
  cells: [TabCell, TabCell, TabCell, TabCell]  // G, D, A, E (top → bottom)
}

interface TabMeasure {
  id:          string
  beats:       TabBeat[]
  repeatStart: boolean
  repeatEnd:   boolean
  section:     string   // section label: 'Intro', 'Verso', etc. ('' = none)
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

interface Cursor {
  measureIdx: number
  beatIdx:    number
  stringIdx:  number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STRING_LABELS  = ['G', 'D', 'A', 'E']
const BEAT_W         = 46
const LABEL_W        = 24
const STRING_SPACING = 22
const TOP_PAD        = 30    // top space — section label lives in y=0..18
const BOT_PAD        = 14
const SVG_H          = TOP_PAD + STRING_SPACING * 3 + BOT_PAD  // 110px
const STRING_Y       = [0,1,2,3].map(i => TOP_PAD + STRING_SPACING * i)  // 30,52,74,96

const KEYS = [
  'C','G','D','A','E','B','F#','Gb','F','Bb','Eb','Ab','Db',
  'Am','Em','Bm','F#m','C#m','G#m','Dm','Gm','Cm','Fm','Bbm',
]
const TIME_SIGS = ['2/4','3/4','4/4','5/4','6/4','6/8','7/8','12/8']
const SECTIONS  = ['Intro','Verso','Pre-Coro','Coro','Puente','Solo','Riff','Breakdown','Outro']
const STORAGE_KEY = 'basstheory-tabs'

// ─────────────────────────────────────────────────────────────────────────────
// Factory helpers
// ─────────────────────────────────────────────────────────────────────────────

let _seq = 0
const uid = () => `t${Date.now()}_${++_seq}`

function emptyCell(): TabCell {
  return { fret: null, isDead: false, isGhost: false, preTech: '', postTech: '', isPM: false }
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
    section: '',
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

function deepCopy<T>(x: T): T { return JSON.parse(JSON.stringify(x)) }

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function cellText(c: TabCell): string {
  if (c.isDead) return 'x'
  if (c.fret === null) return ''
  const core = c.isGhost ? `(${c.fret})` : String(c.fret)
  return (c.preTech || '') + core + (c.postTech || '')
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'2-digit' })
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────────────────────

function loadAllSongs(): TabSong[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
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
function removeSong(id: string) {
  saveAllSongs(loadAllSongs().filter(s => s.id !== id))
}

// ─────────────────────────────────────────────────────────────────────────────
// Song library modal
// ─────────────────────────────────────────────────────────────────────────────

function SongLibrary({ currentId, onLoad, onClose }: {
  currentId: string
  onLoad:    (s: TabSong) => void
  onClose:   () => void
}) {
  const [songs, setSongs] = useState(() =>
    loadAllSongs().sort((a, b) => b.updatedAt - a.updatedAt)
  )

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta tablatura?')) return
    removeSong(id)
    setSongs(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center px-5 py-3 border-b border-gray-800">
          <span className="font-black text-white text-base">📂 Mis Tablaturas</span>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-gray-300 text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {songs.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-10">
              No hay tablaturas guardadas todavía.
            </p>
          )}
          {songs.map(s => (
            <div
              key={s.id}
              onClick={() => { onLoad(s); onClose() }}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                s.id === currentId
                  ? 'border-amber-700/60 bg-amber-900/20'
                  : 'border-gray-800 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{s.title || 'Sin título'}</p>
                <p className="text-gray-500 text-xs truncate">
                  {s.artist || '—'} · {fmtDate(s.updatedAt)} · {s.measures.length} compases
                </p>
              </div>
              {s.id === currentId && (
                <span className="text-xs font-semibold text-amber-500 flex-shrink-0">activa</span>
              )}
              <button
                onClick={e => handleDelete(s.id, e)}
                className="text-gray-700 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                title="Eliminar"
              >
                🗑
              </button>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-800">
          <p className="text-gray-700 text-xs">
            Las tablaturas se guardan automáticamente en este dispositivo.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG row renderer
// ─────────────────────────────────────────────────────────────────────────────

interface RowEntry { measure: TabMeasure; globalIdx: number }

function TabRowSvg({ entries, cursor, onCellClick }: {
  entries:     RowEntry[]
  cursor:      Cursor | null
  onCellClick: (mi: number, bi: number, si: number) => void
}) {
  // Each row always gets string labels on the left-most measure
  const widths = entries.map((e, i) =>
    (i === 0 ? LABEL_W : 0) + BEAT_W * e.measure.beats.length
  )

  const startX: number[] = []
  let cx = 0
  for (let i = 0; i < entries.length; i++) {
    startX.push(cx)
    cx += widths[i] + 2  // +2 for barline gap
  }
  const totalW = cx + 4

  const barTop = STRING_Y[0] - 9
  const barBot = STRING_Y[3] + 9

  return (
    <svg
      width={totalW}
      height={SVG_H}
      style={{ fontFamily: 'monospace', userSelect: 'none', display: 'block' }}
    >
      {/* String lines — full row width */}
      {STRING_Y.map((y, si) => (
        <line key={si} x1={0} y1={y} x2={totalW} y2={y}
          stroke={si === 3 ? '#9ca3af' : '#6b7280'}
          strokeWidth={si === 3 ? 1.5 : 1}
        />
      ))}

      {entries.map(({ measure, globalIdx: mi }, i) => {
        const mx  = startX[i]
        const lw  = i === 0 ? LABEL_W : 0
        const bx0 = mx + lw
        const baw = BEAT_W * measure.beats.length

        return (
          <g key={measure.id}>
            {/* String labels — leftmost measure in each row */}
            {i === 0 && STRING_Y.map((y, si) => (
              <text key={si} x={mx + 5} y={y}
                textAnchor="start" dominantBaseline="central"
                fontSize={11} fontWeight="bold" fill="#6b7280"
                style={{ pointerEvents: 'none' }}>
                {STRING_LABELS[si]}
              </text>
            ))}

            {/* Section label */}
            {measure.section && (
              <text x={bx0 + 5} y={14}
                fontSize={9} fontWeight="bold" fill="#f59e0b" letterSpacing="0.5"
                style={{ pointerEvents: 'none', textTransform: 'uppercase' }}>
                ▶ {measure.section.toUpperCase()}
              </text>
            )}

            {/* Left barline */}
            <line x1={bx0} y1={barTop} x2={bx0} y2={barBot}
              stroke={measure.repeatStart ? '#f59e0b' : '#9ca3af'}
              strokeWidth={measure.repeatStart ? 3 : 2}
            />
            {measure.repeatStart && <>
              <line x1={bx0 + 4} y1={barTop} x2={bx0 + 4} y2={barBot} stroke="#f59e0b" strokeWidth={1} />
              <circle cx={bx0 + 9} cy={STRING_Y[1]} r={2.5} fill="#f59e0b" />
              <circle cx={bx0 + 9} cy={STRING_Y[2]} r={2.5} fill="#f59e0b" />
            </>}

            {/* Beat columns */}
            {measure.beats.map((beat, bi) => {
              const bx = bx0 + bi * BEAT_W
              return (
                <g key={beat.id}>
                  {STRING_Y.map((y, si) => {
                    const cell  = beat.cells[si]
                    const text  = cellText(cell)
                    const isCur = cursor?.measureIdx === mi &&
                                  cursor?.beatIdx    === bi &&
                                  cursor?.stringIdx  === si

                    return (
                      <g key={si} onClick={() => onCellClick(mi, bi, si)} style={{ cursor: 'pointer' }}>
                        {/* Selection background */}
                        {isCur && (
                          <rect x={bx + 2} y={y - 10} width={BEAT_W - 4} height={20}
                            fill="#0d3d38" rx={3} data-cursor="true" />
                        )}

                        {/* PM indicator above string */}
                        {(cell.isPM ?? false) && (
                          <text x={bx + BEAT_W / 2} y={y - 13}
                            textAnchor="middle" fontSize={8} fill="#8b5cf6"
                            fontWeight="bold" style={{ pointerEvents: 'none' }}>
                            PM
                          </text>
                        )}

                        {/* Note text */}
                        {text ? (
                          <text
                            x={bx + BEAT_W / 2} y={y}
                            textAnchor="middle" dominantBaseline="central"
                            fontSize={text.length > 3 ? 9 : text.length > 2 ? 11 : 13}
                            fontWeight="700"
                            fill={isCur ? '#2dd4bf' : text === 'x' ? '#f87171' : '#f1f5f9'}
                            style={{ pointerEvents: 'none' }}>
                            {text}
                          </text>
                        ) : isCur ? (
                          <rect
                            x={bx + BEAT_W / 2 - 1} y={y - 7} width={2} height={14}
                            fill="#2dd4bf" rx={1}
                            className="tab-cursor-blink" data-cursor="true" />
                        ) : null}

                        {/* Invisible click target */}
                        <rect x={bx} y={y - 11} width={BEAT_W} height={22} fill="transparent" />
                      </g>
                    )
                  })}
                </g>
              )
            })}

            {/* Right barline */}
            <line x1={bx0 + baw} y1={barTop} x2={bx0 + baw} y2={barBot}
              stroke={measure.repeatEnd ? '#f59e0b' : '#9ca3af'}
              strokeWidth={measure.repeatEnd ? 3 : 2}
            />
            {measure.repeatEnd && <>
              <line x1={bx0 + baw - 4} y1={barTop} x2={bx0 + baw - 4} y2={barBot} stroke="#f59e0b" strokeWidth={1} />
              <circle cx={bx0 + baw - 9} cy={STRING_Y[1]} r={2.5} fill="#f59e0b" />
              <circle cx={bx0 + baw - 9} cy={STRING_Y[2]} r={2.5} fill="#f59e0b" />
            </>}

            {/* Measure number */}
            <text x={bx0 + baw / 2} y={SVG_H - 3}
              textAnchor="middle" fontSize={8} fill="#374151"
              style={{ pointerEvents: 'none' }}>
              {mi + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface Props { visible: boolean; onClose: () => void }

export default function TabEditor({ visible, onClose }: Props) {
  const [song, setSong]           = useState<TabSong>(() => {
    const saved = loadAllSongs()
    return saved.length > 0 ? saved[0] : newSong()
  })
  const [cursor, setCursor]       = useState<Cursor | null>(null)
  const [pendingDigit, setPending] = useState('')
  const [measPerRow, setMPR]      = useState(4)
  const [showLib, setShowLib]     = useState(false)
  const [clipboard, setClipboard] = useState<TabMeasure | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const sheetRef     = useRef<HTMLDivElement>(null)
  const pendTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historyRef   = useRef<TabSong[]>([])

  // Auto-save
  useEffect(() => { upsertSong(song) }, [song])

  // Focus when opened
  useEffect(() => {
    if (visible) setTimeout(() => containerRef.current?.focus(), 50)
  }, [visible])

  // ── History / undo ─────────────────────────────────────────────────────────

  function pushHistory(prev: TabSong) {
    historyRef.current = [...historyRef.current.slice(-29), prev]
  }
  function undo() {
    const h = historyRef.current
    if (!h.length) return
    setSong(h[h.length - 1])
    historyRef.current = h.slice(0, -1)
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  function update(fn: (s: TabSong) => TabSong) {
    setSong(prev => { pushHistory(prev); return fn({ ...prev, updatedAt: Date.now() }) })
  }

  function updateCell(mi: number, bi: number, si: number, fn: (c: TabCell) => TabCell) {
    update(s => ({
      ...s,
      measures: s.measures.map((m, i) => i !== mi ? m : {
        ...m,
        beats: m.beats.map((b, j) => j !== bi ? b : {
          ...b,
          cells: b.cells.map((c, k) => k !== si ? c : fn(c)) as [TabCell,TabCell,TabCell,TabCell],
        }),
      }),
    }))
  }

  function toggleTech(field: 'preTech' | 'postTech', value: string) {
    if (!cursor) return
    const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor
    updateCell(mi, bi, si, c => ({ ...c, [field]: c[field] === value ? '' : value }))
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function moveCursor(dBeat: number, dStr: number) {
    setCursor(cur => {
      if (!cur) return cur
      const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cur
      const newSi = Math.max(0, Math.min(3, si + dStr))
      if (dBeat === 0) return { ...cur, stringIdx: newSi }
      const m    = song.measures[mi]
      const nbi  = bi + dBeat
      if (nbi >= 0 && nbi < m.beats.length) return { ...cur, beatIdx: nbi, stringIdx: newSi }
      if (dBeat > 0 && mi + 1 < song.measures.length) return { measureIdx: mi + 1, beatIdx: 0, stringIdx: si }
      if (dBeat < 0 && mi > 0) {
        const prev = song.measures[mi - 1]
        return { measureIdx: mi - 1, beatIdx: prev.beats.length - 1, stringIdx: si }
      }
      return cur
    })
  }

  // ── Fret entry ─────────────────────────────────────────────────────────────

  function commitFret(str: string) {
    if (!cursor) return
    const fret = parseInt(str, 10)
    if (isNaN(fret) || fret < 0 || fret > 24) return
    const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor
    updateCell(mi, bi, si, c => ({ ...c, fret, isDead: false }))
    moveCursor(1, 0)
  }

  // ── Keyboard handler ───────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    // ⚠️  Critical: don't intercept typing in input/select/textarea
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

    // Global shortcuts (work without cursor)
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') { e.preventDefault(); undo(); return }
      if (e.key === 'c' && cursor) {
        e.preventDefault()
        const m = song.measures[cursor.measureIdx]
        if (m) setClipboard(deepCopy(m))
        return
      }
      if (e.key === 'v' && cursor && clipboard) {
        e.preventDefault()
        const mi   = cursor.measureIdx
        const newM = { ...deepCopy(clipboard), id: uid() }
        update(s => ({
          ...s,
          measures: [...s.measures.slice(0, mi + 1), newM, ...s.measures.slice(mi + 1)],
        }))
        return
      }
    }

    if (!cursor) return

    // Digit entry with 2-digit support
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      if (pendTimer.current) clearTimeout(pendTimer.current)
      const combined = pendingDigit + e.key
      const num      = parseInt(combined, 10)
      if (pendingDigit && num <= 24) {
        setPending(''); commitFret(combined)
      } else {
        setPending(e.key)
        pendTimer.current = setTimeout(() => { setPending(''); commitFret(e.key) }, 700)
      }
      return
    }

    // Flush pending digit on non-digit key
    if (pendingDigit) {
      if (pendTimer.current) clearTimeout(pendTimer.current)
      commitFret(pendingDigit); setPending('')
    }

    const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor

    switch (e.key) {
      case 'Backspace': case 'Delete':
        e.preventDefault(); updateCell(mi, bi, si, () => emptyCell()); break
      case 'Tab': case 'ArrowRight':
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
        updateCell(mi, bi, si, c => ({ ...c, isDead: !c.isDead, fret: null, preTech: '', postTech: '' }))
        break
      case '(':
        e.preventDefault(); updateCell(mi, bi, si, c => ({ ...c, isGhost: !c.isGhost })); break
      case 'm':
        e.preventDefault(); updateCell(mi, bi, si, c => ({ ...c, isPM: !(c.isPM ?? false) })); break
      case 'Escape':
        setCursor(null); break
    }
  }

  // ── Measure / beat operations ──────────────────────────────────────────────

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
      measures: s.measures.map((m, i) => i !== mi ? m : { ...m, beats: [...m.beats, emptyBeat()] }),
    }))
  }
  function removeBeat() {
    if (!cursor) return
    const mi = cursor.measureIdx
    const m  = song.measures[mi]
    if (m.beats.length <= 1) return
    update(s => ({
      ...s,
      measures: s.measures.map((m, i) => i !== mi ? m : { ...m, beats: m.beats.slice(0, -1) }),
    }))
    setCursor(c => c ? { ...c, beatIdx: Math.min(c.beatIdx, m.beats.length - 2) } : null)
  }
  function toggleRepeat(side: 'repeatStart' | 'repeatEnd') {
    if (!cursor) return
    const mi = cursor.measureIdx
    update(s => ({ ...s, measures: s.measures.map((m, i) => i !== mi ? m : { ...m, [side]: !m[side] }) }))
  }
  function setSection(val: string) {
    if (!cursor) return
    const mi = cursor.measureIdx
    update(s => ({ ...s, measures: s.measures.map((m, i) => i !== mi ? m : { ...m, section: val }) }))
  }

  // ── PDF / Print export ─────────────────────────────────────────────────────

  function handlePrint() {
    const container = sheetRef.current
    if (!container) return

    // Collect all SVGs, strip cursor artifacts, build print-friendly HTML
    const svgBlocks = Array.from(container.querySelectorAll('svg')).map(svg => {
      const clone = svg.cloneNode(true) as SVGElement
      clone.querySelectorAll('[data-cursor="true"]').forEach(n => n.remove())
      clone.querySelectorAll('rect[fill="transparent"]').forEach(n => n.remove())
      // Reset width so it doesn't overflow on paper
      const rawW = parseInt(clone.getAttribute('width') || '800')
      clone.setAttribute('viewBox', `0 0 ${rawW} ${SVG_H}`)
      clone.setAttribute('width', `${Math.min(rawW, 740)}`)
      clone.setAttribute('height', `${SVG_H}`)
      return clone.outerHTML
    })

    const w = window.open('', '_blank', 'width=960,height=800')
    if (!w) { alert('Permitir ventanas emergentes para exportar PDF.'); return }

    w.document.write(`<!DOCTYPE html><html lang="es"><head>
<meta charset="utf-8"/>
<title>${song.title || 'Tab'}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body {
    background:#fff; color:#000;
    font-family:'Courier New',monospace;
    padding:32px 36px; max-width:800px; margin:0 auto;
  }
  h1 { font-size:24px; font-weight:900; margin-bottom:3px; }
  .meta { font-size:12px; color:#555; margin-bottom:28px; border-bottom:1px solid #ddd; padding-bottom:10px; }
  .row { margin-bottom:20px; overflow-x:auto; }
  svg line   { stroke:#333 !important; }
  svg text   { fill:#000 !important; }
  svg circle { fill:#444 !important; stroke:none !important; }
  @media print {
    body { padding:12px 16px; }
    .row { page-break-inside:avoid; }
  }
</style>
</head><body>
<h1>${song.title || 'Sin título'}</h1>
<div class="meta">
  ${song.artist ? `<strong>${song.artist}</strong> &nbsp;·&nbsp; ` : ''}
  &#9833; = ${song.tempo} BPM &nbsp;·&nbsp;
  ${song.timeSignature[0]}/${song.timeSignature[1]} &nbsp;·&nbsp;
  Tonalidad: <strong>${song.key}</strong>
</div>
${svgBlocks.map(s => `<div class="row">${s}</div>`).join('\n')}
<script>window.onload = function(){ window.print() }</script>
</body></html>`)
    w.document.close()
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const selCell    = cursor
    ? song.measures[cursor.measureIdx]?.beats[cursor.beatIdx]?.cells[cursor.stringIdx]
    : null
  const selMeasure = cursor ? song.measures[cursor.measureIdx] : null

  const rows = chunk(
    song.measures.map((m, i) => ({ measure: m, globalIdx: i })),
    measPerRow
  )

  const TECH_BTNS = [
    { label:'/ Slide↑',   field:'preTech'  as const, value:'/'  },
    { label:'\\ Slide↓',  field:'preTech'  as const, value:'\\' },
    { label:'h Hammer',   field:'preTech'  as const, value:'h'  },
    { label:'p Pull-off', field:'preTech'  as const, value:'p'  },
    { label:'b Bend',     field:'postTech' as const, value:'b'  },
    { label:'~ Vibrato',  field:'postTech' as const, value:'~'  },
  ]

  if (!visible) return null

  return (
    <>
      <style>{`
        .tab-cursor-blink { animation: tabBlink 1s step-end infinite; }
        @keyframes tabBlink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      {showLib && (
        <SongLibrary
          currentId={song.id}
          onLoad={s => { setSong(s); setCursor(null) }}
          onClose={() => setShowLib(false)}
        />
      )}

      <div
        className="fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-hidden focus:outline-none"
        tabIndex={-1}
        ref={containerRef}
        onKeyDown={handleKeyDown}
      >
        {/* ── Top bar ──────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-2">
          <span className="font-black text-amber-400 mr-1">🎸 Editor de Tabs</span>
          <button onClick={() => setShowLib(true)}
            className="px-2.5 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
            📂 Mis Tabs
          </button>
          <button
            onClick={() => { if (!confirm('¿Nueva tablatura? Se guardará la actual.')) return; const s = newSong(); setSong(s); setCursor(null) }}
            className="px-2.5 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
            + Nueva
          </button>
          <div className="flex-1" />
          {clipboard && (
            <span className="text-amber-600 text-xs hidden md:block">📋 Ctrl+V para pegar compás</span>
          )}
          <button onClick={handlePrint}
            className="px-2.5 py-1 text-xs rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
            🖨️ PDF
          </button>
          <button onClick={onClose}
            className="ml-1 w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none">
            ✕
          </button>
        </div>

        {/* ── Song metadata ─────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-gray-900/50 border-b border-gray-800 px-4 py-2 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={song.title}
            onChange={e => update(s => ({ ...s, title: e.target.value }))}
            placeholder="Título de la canción"
            className="bg-transparent text-white font-black text-lg focus:outline-none border-b-2 border-transparent focus:border-amber-400 transition-colors placeholder:text-gray-700 w-52"
          />
          <input
            type="text"
            value={song.artist}
            onChange={e => update(s => ({ ...s, artist: e.target.value }))}
            placeholder="Artista"
            className="bg-transparent text-gray-400 text-sm focus:outline-none border-b border-transparent focus:border-gray-500 transition-colors placeholder:text-gray-700 w-36"
          />

          <div className="h-4 w-px bg-gray-700" />

          {/* BPM */}
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-xs select-none">♩ =</span>
            <button
              onClick={() => update(s => ({ ...s, tempo: Math.max(40, s.tempo - 5) }))}
              className="w-5 h-5 flex items-center justify-center rounded bg-gray-800 text-gray-400 hover:bg-gray-700 text-xs transition-colors select-none">
              −
            </button>
            <input
              type="number" value={song.tempo} min={40} max={300}
              onChange={e => update(s => ({ ...s, tempo: Number(e.target.value) || s.tempo }))}
              className="w-12 bg-gray-800/50 text-white text-sm text-center rounded focus:outline-none px-1"
            />
            <button
              onClick={() => update(s => ({ ...s, tempo: Math.min(300, s.tempo + 5) }))}
              className="w-5 h-5 flex items-center justify-center rounded bg-gray-800 text-gray-400 hover:bg-gray-700 text-xs transition-colors select-none">
              +
            </button>
            <span className="text-gray-500 text-xs select-none">BPM</span>
          </div>

          {/* Time signature */}
          <select
            value={`${song.timeSignature[0]}/${song.timeSignature[1]}`}
            onChange={e => { const [n,d] = e.target.value.split('/').map(Number); update(s => ({ ...s, timeSignature: [n,d] as [number,number] })) }}
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

        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-gray-800 px-3 py-1.5 flex items-center gap-1.5 flex-wrap text-xs bg-gray-900/30 min-h-[36px]">

          {/* Always visible: measure controls */}
          <div className="flex items-center gap-1 mr-1">
            <button onClick={addMeasure}
              className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors font-medium">
              + Compás
            </button>
            <button onClick={deleteMeasure} disabled={song.measures.length <= 1}
              className="px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 transition-colors">
              − Compás
            </button>
          </div>

          {/* Context controls (only when cursor active) */}
          {cursor && (
            <>
              <div className="h-4 w-px bg-gray-700" />

              <button onClick={addBeat}
                className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
                + Tiempo
              </button>
              <button onClick={removeBeat}
                className="px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors">
                − Tiempo
              </button>

              {/* Section label */}
              <select
                value={selMeasure?.section ?? ''}
                onChange={e => setSection(e.target.value)}
                className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none"
              >
                <option value="">Sección…</option>
                {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Repeat signs */}
              <button onClick={() => toggleRepeat('repeatStart')}
                title="Inicio de repetición"
                className={`px-2 py-1 rounded font-mono font-bold transition-colors ${selMeasure?.repeatStart ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                |:
              </button>
              <button onClick={() => toggleRepeat('repeatEnd')}
                title="Fin de repetición"
                className={`px-2 py-1 rounded font-mono font-bold transition-colors ${selMeasure?.repeatEnd ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                :|
              </button>

              <div className="h-4 w-px bg-gray-700" />

              {/* Technique buttons */}
              {TECH_BTNS.map(({ label, field, value }) => (
                <button key={value} onClick={() => toggleTech(field, value)}
                  className={`px-2 py-1 rounded font-mono transition-colors ${selCell?.[field] === value ? 'bg-teal-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  {label}
                </button>
              ))}

              <button
                onClick={() => { if (!cursor) return; const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor; updateCell(mi, bi, si, c => ({ ...c, isDead: !c.isDead, fret: null, preTech: '', postTech: '' })) }}
                title="Nota muerta (x)"
                className={`px-2 py-1 rounded font-mono transition-colors ${selCell?.isDead ? 'bg-red-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                x
              </button>
              <button
                onClick={() => { if (!cursor) return; const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor; updateCell(mi, bi, si, c => ({ ...c, isGhost: !c.isGhost })) }}
                title="Nota fantasma ()"
                className={`px-2 py-1 rounded font-mono transition-colors ${selCell?.isGhost ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                ( )
              </button>
              <button
                onClick={() => { if (!cursor) return; const { measureIdx: mi, beatIdx: bi, stringIdx: si } = cursor; updateCell(mi, bi, si, c => ({ ...c, isPM: !(c.isPM ?? false) })) }}
                title="Palm mute"
                className={`px-2 py-1 rounded font-mono transition-colors ${(selCell?.isPM ?? false) ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                PM
              </button>
            </>
          )}

          <div className="flex-1" />

          {/* Measures per row */}
          <div className="flex items-center gap-1">
            <span className="text-gray-700 hidden sm:block">Fila:</span>
            {[2,3,4,6].map(n => (
              <button key={n} onClick={() => setMPR(n)}
                className={`w-6 h-6 rounded text-xs transition-colors ${measPerRow === n ? 'bg-teal-700 text-white' : 'bg-gray-800 text-gray-600 hover:bg-gray-700'}`}>
                {n}
              </button>
            ))}
          </div>

          {pendingDigit && (
            <span className="text-amber-400 font-mono ml-2 tabular-nums">Traste: {pendingDigit}…</span>
          )}
        </div>

        {/* ── Tab sheet ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-6">

          {/* Song title display */}
          <div className="text-center mb-6">
            <p className="text-white font-black text-2xl leading-tight">
              {song.title || 'Sin título'}
            </p>
            {song.artist && (
              <p className="text-gray-400 text-sm mt-1">{song.artist}</p>
            )}
            <p className="text-gray-600 text-xs mt-1">
              ♩ = {song.tempo} BPM &nbsp;·&nbsp;
              {song.timeSignature[0]}/{song.timeSignature[1]} &nbsp;·&nbsp;
              {song.key}
            </p>
          </div>

          {/* Rows of measures */}
          <div ref={sheetRef} className="flex flex-col gap-5">
            {rows.map((row, ri) => (
              <div key={ri} className="overflow-x-auto">
                <TabRowSvg
                  entries={row}
                  cursor={cursor}
                  onCellClick={(mi, bi, si) => {
                    setCursor({ measureIdx: mi, beatIdx: bi, stringIdx: si })
                    containerRef.current?.focus()
                  }}
                />
              </div>
            ))}
          </div>

          {!cursor && (
            <p className="mt-8 text-center text-gray-700 text-xs">
              Hacé click en cualquier celda del diapasón para empezar a editar
              &nbsp;·&nbsp; Ctrl+Z deshacer &nbsp;·&nbsp; Ctrl+C/V copiar/pegar compás
            </p>
          )}

          {/* Keyboard reference */}
          <div className="mt-10 border border-gray-800/70 rounded-xl p-4 max-w-lg mx-auto bg-gray-900/30">
            <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-widest mb-3">
              Referencia rápida
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
              {[
                ['0–24',    'Ingresar traste'],
                ['Del',     'Borrar celda'],
                ['↑↓←→',   'Navegar'],
                ['Tab',     'Sig. tiempo'],
                ['/ \\',   'Slide ↑ ↓'],
                ['h  p',    'Hammer / Pull'],
                ['b  ~',    'Bend / Vibrato'],
                ['x',       'Nota muerta'],
                ['(',       'Nota fantasma'],
                ['m',       'Palm Mute'],
                ['Ctrl+Z',  'Deshacer'],
                ['Ctrl+C',  'Copiar compás'],
                ['Ctrl+V',  'Pegar compás'],
                ['Esc',     'Deseleccionar'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <kbd className="font-mono bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">
                    {k}
                  </kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
