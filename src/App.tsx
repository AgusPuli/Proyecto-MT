import { useEffect, useMemo, useRef, useState } from 'react'
import Fretboard from './components/Fretboard'
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
import { computeFretboard } from './data/notes'
import { getAllScales, BUILT_IN_SCALES, CHROMATIC_SCALE } from './data/scales'
import { scaleRepository } from './data/storage'
import { BUILT_IN_FINGERINGS, DEFAULT_FINGERING } from './data/fingerings'
import { loadCustomFingeringPresets, saveCustomFingeringPreset, deleteCustomFingeringPreset } from './data/fingeringStorage'
import type { ChordFilter, FingeringPreset, LabelMode, NoteName, Scale } from './types'

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
  useEffect(() => {
    const ping = () => fetch('/__heartbeat').catch(() => {})
    ping()
    const id = setInterval(ping, 20_000)
    return () => clearInterval(id)
  }, [])

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeScale = showAllNotes ? CHROMATIC_SCALE : selectedScale
  const activeFingeringPreset = fingeringPresets.find(p => p.id === activeFingeringId)
  const fretboardNotes = useMemo(
    () => computeFretboard(root, activeScale, TOTAL_FRETS, chordFilter, activeFingeringPreset),
    [root, activeScale, chordFilter, activeFingeringPreset],
  )
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
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-4 py-2 flex flex-wrap items-center gap-3 z-20">

        {/* Sidebar toggle */}
        <button onClick={() => setSidebarOpen(v => !v)}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors focus:outline-none"
          title={sidebarOpen ? 'Ocultar sidebar' : 'Mostrar sidebar'}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo */}
        <h1 className="text-lg font-black tracking-tight text-amber-400 mr-2">
          Bass<span className="text-teal-400">Theory</span>
        </h1>

        <div className="h-5 w-px bg-gray-700" />

        <LabelToggle value={labelMode} onChange={setLabelMode} />
        <ChordFilterDropdown value={chordFilter} onChange={setChordFilter} />

        {/* Show all notes */}
        <button onClick={() => setShowAllNotes(!showAllNotes)}
          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors focus:outline-none
            ${showAllNotes ? 'bg-teal-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
          {showAllNotes ? 'Mostrar Escala' : 'Mostrar Todo'}
        </button>

        {/* Practice */}
        <button onClick={() => setPracticeOpen(true)}
          className="px-3 py-1.5 text-sm font-medium rounded bg-gray-800 text-gray-300 hover:bg-amber-900/40 hover:text-amber-300 transition-colors focus:outline-none">
          🎮 Práctica
        </button>

        {/* Tabs */}
        <button onClick={() => setTabOpen(true)}
          className="px-3 py-1.5 text-sm font-medium rounded bg-gray-800 text-gray-300 hover:bg-teal-900/50 hover:text-teal-300 transition-colors focus:outline-none">
          🎸 Tabs
        </button>

        <div className="flex-1" />

        <RootSelector value={root} onChange={setRoot} />

        {/* ── Theme selector ──────────────────────────────────────────────── */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setThemeOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-200 transition-colors focus:outline-none"
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

        {/* Shutdown */}
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
            <Fretboard
              notes={fretboardNotes}
              labelMode={labelMode}
              totalFrets={TOTAL_FRETS}
              onFretClick={handleFretClick}
            />
            <p className="mt-3 text-xs text-gray-600">Click any fret to set it as the root note.</p>
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
      <TabEditor    visible={tabOpen}      onClose={() => setTabOpen(false)} />

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
