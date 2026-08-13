import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Capacitor } from '@capacitor/core'
import Fretboard from './components/Fretboard'
import Piano from './components/Piano'
import CircleOfFifths from './components/CircleOfFifths'
import LabelToggle from './components/LabelToggle'
import RootSelector from './components/RootSelector'
import ChordFilterDropdown from './components/ChordFilterDropdown'
import ScaleLibrary from './components/ScaleLibrary'
import CustomScaleBuilder from './components/CustomScaleBuilder'
import ScaleTones from './components/ScaleTones'
import PracticeMode from './components/PracticeMode'
import SongEditor from './components/SongEditor'
import ChordExplorer from './components/ChordExplorer'
import LandscapeSuggestion from './components/LandscapeSuggestion'
import { computeFretboard, BASS_TUNING, GUITAR_TUNING } from './data/notes'
import { getAllScales, BUILT_IN_SCALES, CHROMATIC_SCALE } from './data/scales'
import { scaleRepository } from './data/storage'
import { DEFAULT_FINGERING } from './data/fingerings'
import type { ChordFilter, InstrumentType, LabelMode, NoteName, Scale } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────────────────────────────────────

async function shutdownServer() {
  try { await fetch('/__shutdown') } catch { /* fine */ }
}

const IS_NATIVE   = Capacitor.isNativePlatform()
const IS_ELECTRON = navigator.userAgent.includes('Electron')

const DEFAULT_ROOT: NoteName = 'A'
const DEFAULT_SCALE: Scale = BUILT_IN_SCALES.find(s => s.id === 'minor-pentatonic')!
const TOTAL_FRETS = 24

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [root, setRoot]             = useState<NoteName>(DEFAULT_ROOT)
  const [selectedScale, setScale]   = useState<Scale>(DEFAULT_SCALE)
  const [labelMode, setLabelMode]   = useState<LabelMode>('note')
  const [customScales, setCustomScales] = useState<Scale[]>(() => scaleRepository.getCustomScales())
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [headerOpen, setHeaderOpen] = useState<boolean>(
    () => localStorage.getItem('mt-header-open') !== 'false'
  )
  const [off, setOff]               = useState(false)
  const [chordFilter, setChordFilter]   = useState<ChordFilter>('all')
  const [showAllNotes, setShowAllNotes] = useState(false)
  const [syncCircle, setSyncCircle] = useState(true)
  const [practiceOpen, setPracticeOpen] = useState(false)
  const [songsOpen, setSongsOpen]   = useState(false)
  const [songsOrigin, setSongsOrigin] = useState({ x: 0, y: 0 })
  const [chordsOpen, setChordsOpen] = useState(false)
  const [instrument, setInstrument] = useState<InstrumentType>('bass')
  // Custom tuning per instrument (null = use standard)
  const [customBassTuning, setCustomBassTuning] = useState<NoteName[] | null>(null)
  const [customGuitarTuning, setCustomGuitarTuning] = useState<NoteName[] | null>(null)

  useEffect(() => {
    localStorage.setItem('mt-header-open', String(headerOpen))
  }, [headerOpen])

  // ── Heartbeat ────────────────────────────────────────────────────────────
  // Solo en el navegador: avisa al dev server que la pestaña sigue abierta.
  // En la app nativa no hay servidor, así que lo salteamos.
  useEffect(() => {
    if (IS_NATIVE || IS_ELECTRON) return
    const ping = () => fetch('/__heartbeat').catch(() => {})
    ping()
    const id = setInterval(ping, 20_000)
    return () => clearInterval(id)
  }, [])

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeScale = showAllNotes ? CHROMATIC_SCALE : selectedScale
  const standardTuning = instrument === 'guitar' ? GUITAR_TUNING : BASS_TUNING
  const customTuning = instrument === 'guitar' ? customGuitarTuning : customBassTuning
  const currentTuning = customTuning ?? standardTuning
  // Check if current tuning matches standard (memoized to keep stable ref)
  const isStandardTuning = useMemo(
    () => !customTuning || customTuning.every((n, i) => n === standardTuning[i]),
    [customTuning, standardTuning],
  )

  const fretboardNotes = useMemo(
    () => computeFretboard(root, activeScale, TOTAL_FRETS, chordFilter, DEFAULT_FINGERING, currentTuning),
    [root, activeScale, chordFilter, currentTuning],
  )

  // Handler to change a single string's tuning (memoized for stable ref)
  const handleStringTuningChange = useCallback((stringIdx: number, newNote: NoteName) => {
    const tuningIdx = (currentTuning.length - 1) - stringIdx
    const newTuning = [...currentTuning] as NoteName[]
    newTuning[tuningIdx] = newNote
    const matchesStandard = newTuning.every((n, i) => n === standardTuning[i])

    if (instrument === 'guitar') {
      setCustomGuitarTuning(matchesStandard ? null : newTuning)
    } else {
      setCustomBassTuning(matchesStandard ? null : newTuning)
    }
  }, [currentTuning, standardTuning, instrument])

  const handleResetTuning = useCallback(() => {
    if (instrument === 'guitar') setCustomGuitarTuning(null)
    else setCustomBassTuning(null)
  }, [instrument])

  const allScales = useMemo(() => getAllScales(customScales), [customScales])

  // Stable click handlers to avoid re-rendering memoized children
  const handleFretClick = useCallback((_string: number, _fret: number, note: NoteName) => {
    setRoot(note)
  }, [])
  const handleScaleSelect = useCallback((scale: Scale) => setScale(scale), [])
  const handleSaveCustomScale = useCallback((scale: Scale) => {
    scaleRepository.saveCustomScale(scale)
    setCustomScales(scaleRepository.getCustomScales())
    setScale(scale)
  }, [])
  const handleDeleteCustomScale = useCallback((id: string) => {
    scaleRepository.deleteCustomScale(id)
    setCustomScales(scaleRepository.getCustomScales())
    setScale(prev => prev.id === id ? DEFAULT_SCALE : prev)
  }, [])

  if (off) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">Servidor apagado. Podés cerrar esta ventana.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">

      <LandscapeSuggestion />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-2 py-1 flex flex-wrap items-center gap-1.5 z-20">

        {/* Sidebar toggle — rectángulo = pantalla, franja izquierda rellena = panel visible */}
        <button onClick={() => setSidebarOpen(v => !v)}
          className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors focus:outline-none"
          title={sidebarOpen ? 'Ocultar panel de escalas' : 'Mostrar panel de escalas'}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <rect x="3" y="4" width="6" height="16" rx="1"
              fill="currentColor" stroke="none" opacity={sidebarOpen ? 0.55 : 0} />
            <line x1="9" y1="4" x2="9" y2="20" />
          </svg>
        </button>

        {/* Logo */}
        <h1 className="text-base font-black tracking-tight text-amber-400">
          Bass<span className="text-teal-400">Theory</span>
        </h1>

        {/* Plegar / desplegar la barra de herramientas — franja superior rellena = visible */}
        <button onClick={() => setHeaderOpen(v => !v)}
          className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors focus:outline-none"
          title={headerOpen ? 'Ocultar barra de herramientas' : 'Mostrar barra de herramientas'}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <rect x="3" y="4" width="18" height="5" rx="1"
              fill="currentColor" stroke="none" opacity={headerOpen ? 0.55 : 0} />
            <line x1="3" y1="9" x2="21" y2="9" />
          </svg>
        </button>

        {headerOpen && (<>
        <div className="h-5 w-px bg-gray-700" />

        <LabelToggle value={labelMode} onChange={setLabelMode} />
        <ChordFilterDropdown value={chordFilter} onChange={setChordFilter} />

        {/* Show all notes */}
        <button onClick={() => setShowAllNotes(!showAllNotes)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors focus:outline-none
            ${showAllNotes ? 'bg-teal-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
          {showAllNotes ? 'Mostrar Escala' : 'Mostrar Todo'}
        </button>

        {/* Practice */}
        <button onClick={() => setPracticeOpen(true)}
          className="px-2 py-1 text-xs font-medium rounded bg-gray-800 text-gray-300 hover:bg-amber-900/40 hover:text-amber-300 transition-colors focus:outline-none">
          🎮 Práctica
        </button>

        {/* Instrument selector */}
        <div className="flex gap-1 bg-gray-800 rounded p-0.5">
          {['bass', 'guitar', 'piano'].map((inst) => (
            <button
              key={inst}
              onClick={() => setInstrument(inst as InstrumentType)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                instrument === inst
                  ? inst === 'piano' ? 'bg-violet-600 text-white' :
                    inst === 'guitar' ? 'bg-teal-600 text-white' :
                    'bg-amber-600 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              title={inst === 'bass' ? 'Bajo (4 cuerdas)' : inst === 'guitar' ? 'Guitarra (6 cuerdas)' : 'Piano'}>
              {inst === 'bass' ? '🎸 Bajo' : inst === 'guitar' ? '🎸 Guitarra' : '🎹 Piano'}
            </button>
          ))}
        </div>

        {/* Canciones — creador de canciones con análisis armónico. */}
        {!IS_NATIVE && (
          <button onClick={e => {
            const r = e.currentTarget.getBoundingClientRect()
            setSongsOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
            setSongsOpen(true)
          }}
            className="px-2 py-1 text-xs font-medium rounded bg-gray-800 text-gray-300 hover:bg-amber-900/50 hover:text-amber-300 transition-colors focus:outline-none">
            🎵 Canciones
          </button>
        )}

        <div className="flex-1" />

        <RootSelector value={root} onChange={setRoot} />

        {/* Shutdown — en navegador apaga el dev server, en Electron cierra la ventana. */}
        {!IS_NATIVE && (
          <button
            onClick={async () => {
              if (!confirm('¿Apagar BassTheory?')) return
              if (IS_ELECTRON) { window.close(); return }
              setOff(true)
              await shutdownServer()
            }}
            className="ml-1 p-1.5 rounded hover:bg-red-900/40 text-gray-600 hover:text-red-400 transition-colors focus:outline-none"
            title="Apagar servidor">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
            </svg>
          </button>
        )}
        </>)}
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className={`flex-shrink-0 bg-gray-900 border-r border-gray-800 overflow-y-auto transition-all duration-200 ease-in-out
          ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
          <div className="p-4 space-y-8 min-w-[288px]">
            <ScaleLibrary
              scales={allScales}
              activeScaleId={selectedScale.id}
              onSelect={handleScaleSelect}
              onDelete={handleDeleteCustomScale}
            />
            <div className="border-t border-gray-800 pt-6 space-y-6">
              <CustomScaleBuilder onSave={handleSaveCustomScale} />
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto p-4 md:p-6 flex flex-col gap-6">
          <div>
            {instrument === 'piano' ? (
              <Piano
                notes={fretboardNotes}
                labelMode={labelMode}
                onNoteClick={(note) => handleFretClick(0, 0, note)}
              />
            ) : (
              <>
                <div className="flex items-stretch gap-3">
                  <div className="flex-1 min-w-0">
                    <Fretboard
                      notes={fretboardNotes}
                      labelMode={labelMode}
                      totalFrets={TOTAL_FRETS}
                      instrument={instrument}
                      tuning={currentTuning}
                      isStandardTuning={isStandardTuning}
                      root={root}
                      scale={selectedScale}
                      onFretClick={handleFretClick}
                      onStringTuningChange={handleStringTuningChange}
                      onResetTuning={handleResetTuning}
                    />
                  </div>

                  {instrument === 'guitar' && (
                    <button
                      onClick={() => setChordsOpen(true)}
                      title="Explorar acordes"
                      className="flex-shrink-0 self-stretch w-[84px] flex flex-col items-center justify-center gap-2 rounded-xl
                                 bg-gradient-to-b from-violet-600 to-violet-700 text-white shadow-lg shadow-violet-900/40
                                 hover:from-violet-500 hover:to-violet-600 hover:shadow-violet-800/50 transition-all focus:outline-none"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-7 h-7">
                        <rect x="5" y="4" width="14" height="16" rx="1.5" />
                        <line x1="9.67" y1="4" x2="9.67" y2="20" />
                        <line x1="14.33" y1="4" x2="14.33" y2="20" />
                        <line x1="5" y1="9.33" x2="19" y2="9.33" />
                        <line x1="5" y1="14.67" x2="19" y2="14.67" />
                        <circle cx="9.67" cy="12" r="1.7" fill="currentColor" stroke="none" />
                      </svg>
                      <span className="text-xs font-bold tracking-wide">Acordes</span>
                    </button>
                  )}
                </div>
                <p className="mt-3 text-xs text-gray-600">Click any fret to set it as the root note.</p>
              </>
            )}

            {instrument === 'piano' ? (
              <div className="flex items-stretch gap-3">
                <div className="flex-1 min-w-0">
                  <ScaleTones root={root} scale={selectedScale} />
                </div>
                <button
                  onClick={() => setChordsOpen(true)}
                  title="Explorar acordes en el teclado"
                  className="flex-shrink-0 self-stretch mt-4 w-[84px] flex flex-col items-center justify-center gap-2 rounded-xl
                             bg-gradient-to-b from-violet-600 to-violet-700 text-white shadow-lg shadow-violet-900/40
                             hover:from-violet-500 hover:to-violet-600 hover:shadow-violet-800/50 transition-all focus:outline-none"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-7 h-7">
                    <rect x="3" y="5" width="18" height="14" rx="1.5" />
                    <line x1="9" y1="5" x2="9" y2="19" />
                    <line x1="15" y1="5" x2="15" y2="19" />
                    <rect x="6.6" y="5" width="2.6" height="8" fill="currentColor" stroke="none" />
                    <rect x="12.6" y="5" width="2.6" height="8" fill="currentColor" stroke="none" />
                  </svg>
                  <span className="text-xs font-bold tracking-wide">Acordes</span>
                </button>
              </div>
            ) : (
              <ScaleTones root={root} scale={selectedScale} />
            )}
          </div>

          <CircleOfFifths
            root={root}
            selectedScale={selectedScale}
            onRootChange={setRoot}
            onScaleChange={setScale}
            synchronized={syncCircle}
            onSyncChange={setSyncCircle}
          />
        </main>
      </div>

      {/* Overlays */}
      <PracticeMode visible={practiceOpen} onClose={() => setPracticeOpen(false)} />
      {!IS_NATIVE && (
        <AnimatePresence>
          {songsOpen && (
            <SongEditor
              key="song-editor"
              origin={songsOrigin}
              onClose={() => setSongsOpen(false)}
              tuning={currentTuning}
            />
          )}
        </AnimatePresence>
      )}
      <ChordExplorer
        visible={chordsOpen}
        onClose={() => setChordsOpen(false)}
        tuning={currentTuning}
        totalFrets={TOTAL_FRETS}
        mode={instrument === 'piano' ? 'piano' : 'guitar'}
      />

      {/* Footer */}
      <footer className="flex-shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-2 flex flex-wrap items-center justify-end gap-3">
        <span className="text-xs text-gray-600">{fretboardNotes.length} notes · {TOTAL_FRETS} frets</span>
      </footer>
    </div>
  )
}
