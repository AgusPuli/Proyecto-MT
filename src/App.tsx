import { useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import Fretboard from './components/Fretboard'
import Piano from './components/Piano'
import CircleOfFifths from './components/CircleOfFifths'
import LabelToggle from './components/LabelToggle'
import RootSelector from './components/RootSelector'
import ChordFilterDropdown from './components/ChordFilterDropdown'
import FingeringPresetSelector from './components/FingeringPresetSelector'
import ScaleLibrary from './components/ScaleLibrary'
import CustomScaleBuilder from './components/CustomScaleBuilder'
import ScaleTones from './components/ScaleTones'
import PracticeMode from './components/PracticeMode'
import TabEditor from './components/TabEditor'
import ChordExplorer from './components/ChordExplorer'
import { computeFretboard, BASS_TUNING, GUITAR_TUNING } from './data/notes'
import { getAllScales, BUILT_IN_SCALES, CHROMATIC_SCALE } from './data/scales'
import { scaleRepository } from './data/storage'
import { BUILT_IN_FINGERINGS, DEFAULT_FINGERING } from './data/fingerings'
import { loadCustomFingeringPresets, saveCustomFingeringPreset, deleteCustomFingeringPreset } from './data/fingeringStorage'
import type { ChordFilter, FingeringPreset, FretboardStyle, InstrumentType, LabelMode, NoteName, Scale } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────────────────────────────────────

type Theme = 'default' | 'high-contrast' | 'evangelion'

const THEMES: { id: Theme; icon: string; label: string }[] = [
  { id: 'default',       icon: '🌙', label: 'Default' },
  { id: 'high-contrast', icon: '⬛', label: 'Alto Contraste' },
  { id: 'evangelion',    icon: '💜', label: 'Evangelion' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────────────────────────────────────

async function shutdownServer() {
  try { await fetch('/__shutdown') } catch { /* fine */ }
}

// true cuando corre como app nativa (Android/iOS), false en el navegador.
// Se usa para desactivar el heartbeat y el botón de apagado del dev server.
const IS_NATIVE = Capacitor.isNativePlatform()

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
  const [syncCircle, setSyncCircle] = useState(false)
  const [fingeringPresets, setFingeringPresets] = useState<FingeringPreset[]>(() => [
    ...BUILT_IN_FINGERINGS,
    ...loadCustomFingeringPresets(),
  ])
  const [activeFingeringId, setActiveFingeringId] = useState<string>(DEFAULT_FINGERING.id)
  const [practiceOpen, setPracticeOpen] = useState(false)
  const [tabOpen, setTabOpen]       = useState(false)
  const [chordsOpen, setChordsOpen] = useState(false)
  const [instrument, setInstrument] = useState<InstrumentType>('bass')
  // Custom tuning per instrument (null = use standard)
  const [customBassTuning, setCustomBassTuning] = useState<NoteName[] | null>(null)
  const [customGuitarTuning, setCustomGuitarTuning] = useState<NoteName[] | null>(null)
  // Fretboard visual style ('classic' default, 'cyberpunk' optional)
  const [fretboardStyle, setFretboardStyle] = useState<FretboardStyle>(
    () => (localStorage.getItem('mt-fretboard-style') as FretboardStyle) ?? 'classic'
  )

  useEffect(() => {
    localStorage.setItem('mt-fretboard-style', fretboardStyle)
  }, [fretboardStyle])

  // Global MAGI UI toggle (applies cyberpunk theme to entire app except piano/practice/tabs)
  const [magiMode, setMagiMode] = useState<boolean>(
    () => localStorage.getItem('mt-magi-mode') === 'true'
  )

  useEffect(() => {
    localStorage.setItem('mt-magi-mode', String(magiMode))
  }, [magiMode])

  useEffect(() => {
    localStorage.setItem('mt-header-open', String(headerOpen))
  }, [headerOpen])

  // ── Theme ────────────────────────────────────────────────────────────────
  const [theme, setTheme]           = useState<Theme>(() =>
    (localStorage.getItem('mt-theme') as Theme) ?? 'default'
  )
  const [themeOpen, setThemeOpen]   = useState(false)
  const themeRef                    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem('mt-theme', theme)
    // Apply to <html> so scrollbars and body bg also get the theme
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Close theme dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false)
      }
    }
    if (themeOpen) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [themeOpen])

  // ── Heartbeat ────────────────────────────────────────────────────────────
  // Solo en el navegador: avisa al dev server que la pestaña sigue abierta.
  // En la app nativa no hay servidor, así que lo salteamos.
  useEffect(() => {
    if (IS_NATIVE) return
    const ping = () => fetch('/__heartbeat').catch(() => {})
    ping()
    const id = setInterval(ping, 20_000)
    return () => clearInterval(id)
  }, [])

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeScale = showAllNotes ? CHROMATIC_SCALE : selectedScale
  const activeFingeringPreset = fingeringPresets.find(p => p.id === activeFingeringId)
  const standardTuning = instrument === 'guitar' ? GUITAR_TUNING : BASS_TUNING
  const customTuning = instrument === 'guitar' ? customGuitarTuning : customBassTuning
  const currentTuning = customTuning ?? standardTuning
  // Check if current tuning matches standard
  const isStandardTuning = !customTuning || customTuning.every((n, i) => n === standardTuning[i])

  const fretboardNotes = useMemo(
    () => computeFretboard(root, activeScale, TOTAL_FRETS, chordFilter, activeFingeringPreset, currentTuning),
    [root, activeScale, chordFilter, activeFingeringPreset, instrument, customTuning],
  )

  // Handler to change a single string's tuning
  function handleStringTuningChange(stringIdx: number, newNote: NoteName) {
    // stringIdx in display order: 0 = top (highest), N-1 = bottom (lowest)
    // Tuning array is reversed: tuning[0] = lowest, tuning[N-1] = highest
    const tuningIdx = (currentTuning.length - 1) - stringIdx
    const newTuning = [...currentTuning] as NoteName[]
    newTuning[tuningIdx] = newNote

    // Check if new tuning matches standard (would reset to null)
    const matchesStandard = newTuning.every((n, i) => n === standardTuning[i])

    if (instrument === 'guitar') {
      setCustomGuitarTuning(matchesStandard ? null : newTuning)
    } else {
      setCustomBassTuning(matchesStandard ? null : newTuning)
    }
  }

  // Handler to reset tuning to standard
  function handleResetTuning() {
    if (instrument === 'guitar') {
      setCustomGuitarTuning(null)
    } else {
      setCustomBassTuning(null)
    }
  }
  const allScales = useMemo(() => getAllScales(customScales), [customScales])

  function handleFretClick(_string: number, _fret: number, note: NoteName) { setRoot(note) }
  function handleScaleSelect(scale: Scale) { setScale(scale) }
  function handleSaveCustomScale(scale: Scale) {
    scaleRepository.saveCustomScale(scale)
    setCustomScales(scaleRepository.getCustomScales())
    setScale(scale)
  }
  function handleDeleteCustomScale(id: string) {
    scaleRepository.deleteCustomScale(id)
    const updated = scaleRepository.getCustomScales()
    setCustomScales(updated)
    if (selectedScale.id === id) setScale(DEFAULT_SCALE)
  }

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
    <div className={`${magiMode ? 'cyber-ui' : ''} flex flex-col h-screen bg-gray-950 text-white overflow-hidden`}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-2 py-1 flex flex-wrap items-center gap-1.5 z-20">

        {/* Sidebar toggle */}
        <button onClick={() => setSidebarOpen(v => !v)}
          className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors focus:outline-none"
          title={sidebarOpen ? 'Ocultar escalas' : 'Mostrar escalas'}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo */}
        <h1 className="text-base font-black tracking-tight text-amber-400">
          Bass<span className="text-teal-400">Theory</span>
        </h1>

        {/* Plegar / desplegar la barra de herramientas */}
        <button onClick={() => setHeaderOpen(v => !v)}
          className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors focus:outline-none"
          title={headerOpen ? 'Ocultar barra de herramientas' : 'Mostrar barra de herramientas'}>
          <svg className={`w-4 h-4 transition-transform ${headerOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
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

        {/* Tabs — no se incluye en la app nativa (solo navegador). */}
        {!IS_NATIVE && (
          <button onClick={() => setTabOpen(true)}
            className="px-2 py-1 text-xs font-medium rounded bg-gray-800 text-gray-300 hover:bg-teal-900/50 hover:text-teal-300 transition-colors focus:outline-none">
            🎸 Tabs
          </button>
        )}

        <div className="flex-1" />

        <RootSelector value={root} onChange={setRoot} />

        {/* ── MAGI mode toggle ────────────────────────────────────────────── */}
        <button
          onClick={() => setMagiMode(v => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${
            magiMode
              ? 'bg-[#0a0e10] text-[#c97a3a] border border-[rgba(201,122,58,0.6)] shadow-[inset_0_0_8px_rgba(201,122,58,0.15)]'
              : 'bg-gray-800 text-gray-400 border border-transparent hover:bg-gray-700 hover:text-gray-200'
          }`}
          title={magiMode ? 'Desactivar tema MAGI' : 'Activar tema MAGI'}
        >
          <span className={magiMode ? 'text-[#6b9560]' : 'opacity-60'}>◢</span>
          MAGI
          {magiMode && <span className="text-[10px] text-[#6b9560]">●</span>}
        </button>

        {/* ── Theme selector ──────────────────────────────────────────────── */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setThemeOpen(v => !v)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-200 transition-colors focus:outline-none"
            title="Cambiar tema">
            <span>{THEMES.find(t => t.id === theme)?.icon}</span>
            <span className="hidden sm:inline text-xs">{THEMES.find(t => t.id === theme)?.label}</span>
            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {themeOpen && (
            <div className="absolute right-0 top-full mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[170px]">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold px-3 pt-2.5 pb-1">Tema</p>
              {THEMES.map(t => (
                <button key={t.id}
                  onClick={() => { setTheme(t.id); setThemeOpen(false) }}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                    theme === t.id
                      ? 'bg-amber-900/50 text-amber-300'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}>
                  <span className="text-base leading-none">{t.icon}</span>
                  <span className="font-medium">{t.label}</span>
                  {theme === t.id && (
                    <svg className="w-3.5 h-3.5 ml-auto text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Shutdown — solo en el navegador (apaga el dev server). En la app no aplica. */}
        {!IS_NATIVE && (
          <button
            onClick={async () => {
              if (!confirm('¿Apagar BassTheory?')) return
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
              <FingeringPresetSelector
                presets={fingeringPresets}
                activePresetId={activeFingeringId}
                onSelect={p => setActiveFingeringId(p.id)}
                onSave={p => {
                  if (p.isCustom) saveCustomFingeringPreset(p)
                  const idx = fingeringPresets.findIndex(x => x.id === p.id)
                  if (idx >= 0) {
                    const updated = [...fingeringPresets]; updated[idx] = p; setFingeringPresets(updated)
                  } else {
                    setFingeringPresets([...fingeringPresets, p])
                  }
                }}
                onDelete={id => {
                  deleteCustomFingeringPreset(id)
                  setFingeringPresets(fingeringPresets.filter(p => p.id !== id))
                  if (activeFingeringId === id) setActiveFingeringId(DEFAULT_FINGERING.id)
                }}
              />
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
                      style={fretboardStyle}
                      onFretClick={handleFretClick}
                      onStringTuningChange={handleStringTuningChange}
                      onResetTuning={handleResetTuning}
                      onStyleChange={setFretboardStyle}
                    />
                  </div>

                  {instrument === 'guitar' && (
                    <button
                      onClick={() => setChordsOpen(true)}
                      title="Explorar acordes"
                      className="flex-shrink-0 self-stretch w-[72px] flex flex-col items-center justify-center gap-2 rounded-xl
                                 bg-gradient-to-b from-teal-600 to-teal-700 text-white shadow-lg shadow-teal-900/40
                                 hover:from-teal-500 hover:to-teal-600 hover:shadow-teal-800/50 transition-all focus:outline-none"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7">
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
            <ScaleTones root={root} scale={selectedScale} />
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
      {!IS_NATIVE && <TabEditor visible={tabOpen} onClose={() => setTabOpen(false)} />}
      <ChordExplorer
        visible={chordsOpen}
        onClose={() => setChordsOpen(false)}
        tuning={currentTuning}
        totalFrets={TOTAL_FRETS}
      />

      {/* Footer */}
      <footer className="flex-shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-2 flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-amber-400">
          {root}&nbsp;{selectedScale.name}
        </span>
        <div className="h-4 w-px bg-gray-700" />
        <div className="flex flex-wrap gap-1">
          {selectedScale.intervals.map(interval => (
            <span key={interval}
              className={`px-1.5 py-0.5 rounded text-xs font-semibold ${interval === '1'
                ? 'bg-amber-400/20 text-amber-400 border border-amber-700/50'
                : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
              {interval}
            </span>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-xs text-gray-600">{fretboardNotes.length} notes · {TOTAL_FRETS} frets</span>
      </footer>
    </div>
  )
}
