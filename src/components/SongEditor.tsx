import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NoteName } from '../types'
import { CHROMATIC_NOTES } from '../data/notes'
import { parseChord } from '../data/chordParser'
import { analyzeChord, getDiatonicChords, keyLabel, type ChordAnalysis, type KeyMode, type SongKey } from '../data/harmony'
import { parseSongBody, replaceChordAt, insertChordAtOffset, extractChordSequence, type ChordToken } from '../data/songParser'
import { getSongStorage, newSong, type Song, type SongMeta } from '../data/songStorage'
import SongPages, { analysisKey } from './SongPages'
import SongAssistantPanel from './SongAssistantPanel'
import ChordPickerModal from './ChordPickerModal'

// ─────────────────────────────────────────────────────────────────────────────
// SongEditor — full-screen overlay.
// Songwriting assistant: lyrics + chord annotations + harmonic analysis.
// ─────────────────────────────────────────────────────────────────────────────

interface SongEditorProps {
  origin: { x: number; y: number }
  onClose: () => void
}

type ViewMode = 'edit' | 'view' | 'split'

const AUTOSAVE_MS = 600

// ── Library modal ────────────────────────────────────────────────────────────

function SongLibrary({
  songs, folder, isFileBacked, onOpen, onCreate, onDelete, onChangeFolder, onDismiss, onExit, hasCurrent,
}: {
  songs: SongMeta[]
  folder: string | null
  isFileBacked: boolean
  onOpen: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onChangeFolder: () => void
  onDismiss: () => void
  onExit: () => void
  hasCurrent: boolean
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center"
      onClick={hasCurrent ? onDismiss : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="bg-gray-900 border border-gray-700 rounded-lg p-5 w-[34rem] max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 4 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-4 gap-2">
          <button onClick={onExit}
            title="Volver a la aplicación"
            className="p-1.5 -ml-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors focus:outline-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-200 flex-1">Mis canciones</h2>
          <button onClick={onCreate}
            className="px-3 py-1.5 text-sm font-medium rounded bg-amber-500 text-amber-950 hover:bg-amber-400 transition-colors focus:outline-none">
            + Nueva canción
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {songs.length === 0 && (
            <div className="text-gray-500 italic text-sm py-6 text-center">
              Todavía no hay canciones. ¡Creá la primera!
            </div>
          )}
          {songs.map(s => (
            <div key={s.id}
              className="flex items-center gap-3 p-3 rounded bg-gray-800 border border-gray-700 hover:border-amber-500/40 transition-colors">
              <button onClick={() => onOpen(s.id)} className="flex-1 text-left focus:outline-none">
                <div className="font-semibold text-gray-200">{s.title || 'Sin título'}</div>
                <div className="text-xs text-gray-400">
                  {keyLabel(s.key)} · ♩ {s.tempo ?? '—'} · {new Date(s.updatedAt).toLocaleDateString()}
                </div>
              </button>
              <button
                onClick={() => { if (confirm(`¿Eliminar "${s.title}"?`)) onDelete(s.id) }}
                className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-900/30 transition-colors focus:outline-none"
                title="Eliminar">
                🗑
              </button>
            </div>
          ))}
        </div>

        {isFileBacked && (
          <div className="mt-4 pt-3 border-t border-gray-800 flex items-center gap-2 text-xs text-gray-500">
            <span className="truncate flex-1" title={folder ?? ''}>📁 {folder ?? '…'}</span>
            <button onClick={onChangeFolder}
              className="px-2 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors focus:outline-none shrink-0">
              Cambiar carpeta…
            </button>
          </div>
        )}

        {hasCurrent && (
          <button onClick={onDismiss}
            className="mt-3 text-xs text-gray-500 hover:text-gray-300 focus:outline-none">
            Cerrar
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Chord edit popover (click a chord in the sheet) ─────────────────────────

function ChordEditModal({
  initial, songKey, onConfirm, onDelete, onDismiss,
}: {
  initial: string
  songKey: SongKey
  onConfirm: (name: string) => void
  onDelete: () => void
  onDismiss: () => void
}) {
  const [value, setValue] = useState(initial)
  const [pickerOpen, setPickerOpen] = useState(false)
  const valid = parseChord(value) !== null
  const diatonic = getDiatonicChords(songKey)

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center"
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-80"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 4 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <h3 className="text-sm font-bold text-gray-300 mb-3">Editar acorde</h3>
        <div className="flex gap-2">
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && valid) onConfirm(value.trim()) }}
            className={`flex-1 px-2 py-1.5 rounded bg-gray-800 border text-gray-200 font-mono focus:outline-none
              ${valid || value === '' ? 'border-gray-700 focus:border-amber-500' : 'border-red-700'}`}
          />
          <button
            onClick={() => setPickerOpen(true)}
            title="Elegir con la rueda"
            className="px-2.5 py-1.5 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-teal-500/50 transition-colors focus:outline-none">
            🎡
          </button>
        </div>
        {!valid && value !== '' && (
          <div className="text-xs text-red-400 mt-1">No es un acorde válido</div>
        )}
        <div className="flex flex-wrap gap-1 mt-3">
          {diatonic.map(c => (
            <button key={c.roman} onClick={() => setValue(c.name)}
              className="px-2 py-0.5 text-xs rounded bg-gray-800 border border-gray-700 text-amber-400 hover:bg-gray-700 focus:outline-none">
              {c.name}
            </button>
          ))}
        </div>
        <ChordPickerModal
          visible={pickerOpen}
          onPick={name => setValue(name)}
          onClose={() => setPickerOpen(false)}
        />
        <div className="flex gap-2 mt-4">
          <button
            disabled={!valid}
            onClick={() => onConfirm(value.trim())}
            className="flex-1 px-3 py-1.5 text-sm font-medium rounded bg-amber-500 text-amber-950 hover:bg-amber-400 disabled:opacity-40 transition-colors focus:outline-none">
            Aceptar
          </button>
          <button onClick={onDelete}
            className="px-3 py-1.5 text-sm rounded bg-gray-800 text-red-400 hover:bg-red-900/40 transition-colors focus:outline-none">
            Quitar
          </button>
          <button onClick={onDismiss}
            className="px-3 py-1.5 text-sm rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors focus:outline-none">
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main editor ──────────────────────────────────────────────────────────────

export default function SongEditor({ origin, onClose }: SongEditorProps) {
  const storage = getSongStorage()

  const [songs, setSongs] = useState<SongMeta[]>([])
  const [current, setCurrent] = useState<Song | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(true)
  const [folder, setFolder] = useState<string | null>(null)
  const [mode, setMode] = useState<ViewMode>('split')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [editingChord, setEditingChord] = useState<{ line: number; token: ChordToken } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Tonalidad local del panel de acordes — independiente de la tonalidad de la
  // canción, para poder explorar acordes de otra tonalidad sin afectarla.
  const [panelKey, setPanelKey] = useState<SongKey>({ root: 'C', mode: 'major' })

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cursorRef = useRef(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSong = useRef<Song | null>(null)

  // ── Load library on mount ──
  useEffect(() => {
    storage.listSongs().then(setSongs)
    storage.getSongsFolder().then(setFolder)
  }, [])

  // ── Liquid reveal radius: big enough to cover the farthest screen corner ──
  // Computed synchronously (not via effect) so the very first render already
  // has the real target — framer-motion then animates initial → animate cleanly.
  const radius = useMemo(() => {
    const w = window.innerWidth, h = window.innerHeight
    const dx = Math.max(origin.x, w - origin.x)
    const dy = Math.max(origin.y, h - origin.y)
    return Math.hypot(dx, dy) + 40
  }, [origin])

  // ── Debounced auto-save ──
  function scheduleSave(song: Song) {
    pendingSong.current = song
    setSaveState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flushSave, AUTOSAVE_MS)
  }

  async function flushSave() {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    const song = pendingSong.current
    if (!song) return
    pendingSong.current = null
    try {
      await storage.writeSong(song)
      setSaveState('saved')
      storage.listSongs().then(setSongs)
    } catch {
      setSaveState('error')
    }
  }

  function update(patch: Partial<Song>) {
    if (!current) return
    const next = { ...current, ...patch, updatedAt: Date.now() }
    setCurrent(next)
    scheduleSave(next)
  }

  // ── Derived: parse + analyses ──
  const body = current?.body ?? ''
  const songKey: SongKey = current?.key ?? { root: 'C', mode: 'major' }

  const parsed = useMemo(() => parseSongBody(body), [body])

  const analyses = useMemo(() => {
    const map = new Map<string, ChordAnalysis>()
    for (const line of parsed) {
      if (line.type !== 'lyric') continue
      for (const t of line.chords) {
        if (!t.chord) continue
        const k = analysisKey(t.chord.root, t.chord.quality.id)
        if (!map.has(k)) map.set(k, analyzeChord(t.chord, songKey))
      }
    }
    return map
  }, [parsed, songKey.root, songKey.mode])

  const lastChord = useMemo(() => {
    const seq = extractChordSequence(parsed)
    return seq.length ? seq[seq.length - 1] : null
  }, [parsed])

  // ── Actions ──
  async function openSong(id: string) {
    await flushSave()
    const song = await storage.readSong(id)
    if (song) {
      setCurrent(song)
      setPanelKey(song.key)
      setLibraryOpen(false)
    }
  }

  async function createSong() {
    await flushSave()
    const song = newSong()
    setCurrent(song)
    setPanelKey(song.key)
    setLibraryOpen(false)
    await storage.writeSong(song)
    storage.listSongs().then(setSongs)
  }

  async function deleteSong(id: string) {
    await storage.deleteSong(id)
    if (current?.id === id) setCurrent(null)
    storage.listSongs().then(setSongs)
  }

  async function changeFolder() {
    const picked = await storage.chooseSongsFolder()
    if (picked) {
      setFolder(picked)
      storage.listSongs().then(setSongs)
    }
  }

  function insertChord(name: string) {
    if (!current) return
    if (mode === 'view') setMode('split')
    const offset = cursorRef.current
    const next = insertChordAtOffset(current.body, offset, name)
    update({ body: next })
    // restore focus after the inserted token
    requestAnimationFrame(() => {
      const ta = textareaRef.current
      if (ta) {
        ta.focus()
        const pos = offset + name.length + 2
        ta.setSelectionRange(pos, pos)
        cursorRef.current = pos
      }
    })
  }

  function handleClose() {
    flushSave()
    onClose()
  }

  function handlePrint() {
    // The A4 pages must be mounted (Vista/Ambos) before we can print them.
    if (mode === 'edit') setMode('split')
    requestAnimationFrame(() => setTimeout(() => window.print(), 50))
  }

  // Liquid reveal: a small blob grows from the click point until it covers
  // the screen (scale transform — framer-motion's most reliable property),
  // then the actual UI fades in on top.
  const BLOB_SIZE = 40
  const coverScale = (radius * 2) / BLOB_SIZE

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute rounded-full bg-gray-950 pointer-events-auto"
        style={{
          left: origin.x, top: origin.y, width: BLOB_SIZE, height: BLOB_SIZE,
          translateX: '-50%', translateY: '-50%',
        }}
        initial={{ scale: 0 }}
        animate={{ scale: coverScale, transition: { type: 'spring', stiffness: 60, damping: 18, mass: 0.9 } }}
        exit={{ scale: 0, transition: { delay: 0.12, duration: 0.35, ease: [0.4, 0, 1, 1] } }}
      />

      <motion.div
        className="relative h-full flex flex-col overflow-hidden pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.28, duration: 0.25 } }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
      >

      {/* ── Header bar ── */}
      <header className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 bg-gray-900 flex-wrap">
        <button onClick={handleClose}
          className="px-2 py-1 text-sm rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors focus:outline-none">
          ← Cerrar
        </button>

        <h1 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Canciones</h1>

        {current && (<>
          <input
            value={current.title}
            onChange={e => update({ title: e.target.value })}
            placeholder="Título"
            className="px-2 py-1 text-sm rounded bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-amber-500 w-48"
          />

          {/* Tonalidad */}
          <div className="flex items-center gap-1 text-sm">
            <span className="text-gray-500 text-xs">Tonalidad:</span>
            <select
              value={songKey.root}
              onChange={e => update({ key: { ...songKey, root: e.target.value as NoteName } })}
              className="px-1.5 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none">
              {CHROMATIC_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select
              value={songKey.mode}
              onChange={e => update({ key: { ...songKey, mode: e.target.value as KeyMode } })}
              className="px-1.5 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none">
              <option value="major">mayor</option>
              <option value="minor">menor</option>
            </select>
          </div>

          {/* Apunte: acordes diatónicos de la tonalidad de la canción */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-gray-500 border-l border-gray-800 pl-3">
            {getDiatonicChords(songKey).map(c => (
              <span key={c.roman} className="text-amber-400/80 font-semibold whitespace-nowrap">{c.name}</span>
            ))}
          </div>

          {/* Tempo */}
          <div className="flex items-center gap-1 text-sm">
            <span className="text-gray-500 text-xs">♩ =</span>
            <input
              type="number" min={20} max={400}
              value={current.tempo ?? ''}
              onChange={e => update({ tempo: e.target.value === '' ? null : Number(e.target.value) })}
              className="w-16 px-1.5 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Mode toggle */}
          <div className="inline-flex rounded-md overflow-hidden border border-gray-700">
            {([['edit', 'Editar'], ['view', 'Vista'], ['split', 'Ambos']] as [ViewMode, string][]).map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none
                  ${mode === m ? 'bg-amber-400 text-amber-950' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={handlePrint}
            title="Imprimir o guardar como PDF"
            className="px-2 py-1 text-xs font-medium rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors focus:outline-none">
            🖨️ Imprimir / PDF
          </button>
        </>)}

        <div className="flex-1" />

        <button onClick={() => setLibraryOpen(true)}
          className="px-2 py-1 text-sm rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors focus:outline-none">
          📚 Biblioteca
        </button>

        {current && (
          <span className={`text-xs ${saveState === 'error' ? 'text-red-400' : 'text-gray-500'}`}>
            {saveState === 'saved' ? 'Guardado ✓' : saveState === 'saving' ? 'Guardando…' : 'Error al guardar'}
          </span>
        )}
      </header>

      {/* ── Body ── */}
      {current ? (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {(mode === 'edit' || mode === 'split') && (
              <textarea
                ref={textareaRef}
                value={current.body}
                onChange={e => { cursorRef.current = e.target.selectionStart; update({ body: e.target.value }) }}
                onSelect={e => { cursorRef.current = (e.target as HTMLTextAreaElement).selectionStart }}
                onKeyUp={e => { cursorRef.current = (e.target as HTMLTextAreaElement).selectionStart }}
                placeholder={'[Intro]\n\n[Primera Parte]\n[C]La espera me ago[D]tó\n[G#m]No sé nada de [A]vos'}
                spellCheck={false}
                className={`${mode === 'split' ? 'w-1/2 border-r border-gray-800' : 'flex-1'}
                  bg-gray-950 text-gray-200 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed`}
              />
            )}
            {(mode === 'view' || mode === 'split') && (
              <div className={`${mode === 'split' ? 'w-1/2' : 'flex-1'} overflow-y-auto p-6 bg-gray-800`}>
                <SongPages
                  song={current}
                  parsed={parsed}
                  analyses={analyses}
                  onChordClick={(line, token) => setEditingChord({ line, token })}
                />
              </div>
            )}
          </div>

          <SongAssistantPanel
            songKey={songKey}
            panelKey={panelKey}
            onPanelKeyChange={setPanelKey}
            lastChord={lastChord}
            onInsertChord={insertChord}
            onOpenPicker={() => setPickerOpen(true)}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 italic bg-gray-950">
          Abrí una canción desde la biblioteca
        </div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {libraryOpen && (
          <SongLibrary
            key="song-library"
            songs={songs}
            folder={folder}
            isFileBacked={storage.isFileBacked}
            onOpen={openSong}
            onCreate={createSong}
            onDelete={deleteSong}
            onChangeFolder={changeFolder}
            onDismiss={() => setLibraryOpen(false)}
            onExit={handleClose}
            hasCurrent={current !== null}
          />
        )}
      </AnimatePresence>

      <ChordPickerModal
        visible={pickerOpen}
        onPick={insertChord}
        onClose={() => setPickerOpen(false)}
      />

      <AnimatePresence>
        {editingChord && current && (
          <ChordEditModal
            key="chord-edit"
            initial={editingChord.token.raw}
            songKey={songKey}
            onConfirm={name => {
              update({ body: replaceChordAt(current.body, editingChord.line, editingChord.token.srcStart, editingChord.token.srcEnd, name) })
              setEditingChord(null)
            }}
            onDelete={() => {
              update({ body: replaceChordAt(current.body, editingChord.line, editingChord.token.srcStart, editingChord.token.srcEnd, '') })
              setEditingChord(null)
            }}
            onDismiss={() => setEditingChord(null)}
          />
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  )
}
