import { useState } from 'react'
import type { ParsedChord } from '../data/chordParser'
import { CHROMATIC_NOTES } from '../data/notes'
import type { NoteName } from '../types'
import {
  getDiatonicChords, getHarmonicMinorExtras, suggestNextChords,
  keyLabel, FUNC_LABEL, type KeyMode, type SongKey,
} from '../data/harmony'

// ─────────────────────────────────────────────────────────────────────────────
// SongAssistantPanel — right-hand panel of the song editor:
//   1. Diatonic chord palette (click to insert) — has ITS OWN key selector
//      (panelKey), independent from the song's actual key, so you can browse
//      another key's chords without changing the song.
//   2. Next-chord suggestions based on the last chord written (uses the
//      song's real key, since it reasons about the actual song harmony).
//   3. Collapsible syntax help + color legend
// ─────────────────────────────────────────────────────────────────────────────

interface SongAssistantPanelProps {
  songKey: SongKey
  panelKey: SongKey
  onPanelKeyChange: (key: SongKey) => void
  lastChord: ParsedChord | null
  onInsertChord: (name: string) => void
  onOpenPicker: () => void
}

function ChordChip({
  name, roman, sub, onClick,
}: { name: string; roman: string; sub?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={sub}
      className="flex flex-col items-center px-2 py-1.5 rounded bg-gray-800 border border-gray-700
        hover:bg-gray-700 hover:border-amber-500/50 transition-colors focus:outline-none min-w-[3.2rem]"
    >
      <span className="text-sm font-bold text-amber-400">{name}</span>
      <span className="text-[10px] text-gray-400">{roman}</span>
    </button>
  )
}

export default function SongAssistantPanel({
  songKey, panelKey, onPanelKeyChange, lastChord, onInsertChord, onOpenPicker,
}: SongAssistantPanelProps) {
  const [helpOpen, setHelpOpen] = useState(false)

  const diatonic = getDiatonicChords(panelKey)
  const extras = getHarmonicMinorExtras(panelKey)
  const suggestions = suggestNextChords(lastChord, songKey)
  const followsSong = panelKey.root === songKey.root && panelKey.mode === songKey.mode

  return (
    <div className="w-72 shrink-0 border-l border-gray-800 bg-gray-900/50 overflow-y-auto p-3 flex flex-col gap-4">

      {/* ── Diatonic palette — tonalidad local, independiente de la canción ── */}
      <section>
        <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
          Ver acordes de:
        </h3>
        <div className="flex items-center gap-1 text-sm mb-2">
          <select
            value={panelKey.root}
            onChange={e => onPanelKeyChange({ ...panelKey, root: e.target.value as NoteName })}
            className="px-1.5 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200 text-xs focus:outline-none">
            {CHROMATIC_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select
            value={panelKey.mode}
            onChange={e => onPanelKeyChange({ ...panelKey, mode: e.target.value as KeyMode })}
            className="px-1.5 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200 text-xs focus:outline-none">
            <option value="major">mayor</option>
            <option value="minor">menor</option>
          </select>
          {!followsSong && (
            <button
              onClick={() => onPanelKeyChange(songKey)}
              title="Volver a la tonalidad de la canción"
              className="text-[10px] text-teal-400 hover:text-teal-300 underline underline-offset-2 focus:outline-none whitespace-nowrap">
              usar la de la canción
            </button>
          )}
        </div>
        <h4 className="text-[11px] text-gray-500 mb-1.5">
          Acordes de {keyLabel(panelKey)}:
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {diatonic.map(c => (
            <ChordChip key={c.roman} name={c.name} roman={c.roman}
              sub={FUNC_LABEL[c.func]} onClick={() => onInsertChord(c.name)} />
          ))}
        </div>
        {extras.length > 0 && (
          <div className="mt-2">
            <div className="text-[10px] text-gray-500 mb-1">De la menor armónica:</div>
            <div className="flex flex-wrap gap-1.5">
              {extras.map(c => (
                <ChordChip key={c.roman} name={c.name} roman={c.roman}
                  sub={FUNC_LABEL[c.func]} onClick={() => onInsertChord(c.name)} />
              ))}
            </div>
          </div>
        )}

        {/* Simplified: every degree reduced to plain major/minor (dim → m) */}
        <div className="mt-3">
          <div className="text-[10px] text-gray-500 mb-1">
            Simplificados <span className="opacity-70">(solo mayores y menores)</span>:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {diatonic.map(c => {
              const simplified = c.triadQualityId === 'dim'
              const name = simplified ? `${c.root}m` : c.name
              return (
                <ChordChip key={`simple-${c.roman}`} name={name} roman={c.roman}
                  sub={simplified ? `${c.name} simplificado` : FUNC_LABEL[c.func]}
                  onClick={() => onInsertChord(name)} />
              )
            })}
          </div>
        </div>
        <button
          onClick={onOpenPicker}
          className="mt-2 w-full px-2 py-1.5 text-xs font-medium rounded bg-gray-800 border border-gray-700
            text-gray-300 hover:bg-gray-700 hover:border-teal-500/50 transition-colors focus:outline-none">
          🎡 Elegir otro acorde…
        </button>
      </section>

      {/* ── Suggestions ── */}
      <section>
        <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
          {lastChord ? `Después de ${lastChord.input}…` : 'Para empezar…'}
        </h3>
        <div className="flex flex-col gap-1.5">
          {suggestions.map((s, i) => (
            <button key={i}
              onClick={() => onInsertChord(s.chord.name)}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-800 border border-gray-700
                hover:bg-gray-700 hover:border-teal-500/50 transition-colors focus:outline-none text-left"
            >
              <span className="text-sm font-bold text-teal-300 w-12">{s.chord.name}</span>
              <span className="text-[10px] text-gray-400 w-8">{s.chord.roman}</span>
              {s.reason && <span className="text-[10px] text-gray-500 flex-1">{s.reason}</span>}
            </button>
          ))}
        </div>
      </section>

      {/* ── Help ── */}
      <section>
        <button
          onClick={() => setHelpOpen(v => !v)}
          className="text-xs font-semibold uppercase text-gray-500 hover:text-gray-300 focus:outline-none"
        >
          {helpOpen ? '▾' : '▸'} Ayuda
        </button>
        {helpOpen && (
          <div className="mt-2 text-xs text-gray-400 flex flex-col gap-2">
            <div>
              <span className="text-gray-300 font-semibold">Sintaxis:</span>
              <div className="mt-1 bg-gray-800 rounded p-2 font-mono text-[11px]">
                [Estribillo]<br />
                [Am]La espera me a[C]gotó
              </div>
              <div className="mt-1">
                Un corchete solo en una línea = sección. Dentro de la letra = acorde anclado a esa sílaba.
              </div>
            </div>
            <div>
              <span className="text-gray-300 font-semibold">Colores:</span>
              <ul className="mt-1 flex flex-col gap-0.5">
                <li><span className="text-amber-400 font-bold">Am</span> — diatónico (pertenece a la tonalidad)</li>
                <li><span className="text-teal-300 font-bold">E7</span> — de la menor armónica</li>
                <li><span className="text-violet-400 font-bold">G</span> — prestado (intercambio modal)</li>
                <li><span className="text-orange-400 font-bold">B7</span> — dominante secundario</li>
                <li><span className="text-red-400 font-bold">Cm</span> — no diatónico</li>
              </ul>
            </div>
            <div>
              Pasá el mouse por un acorde en la Vista para ver su análisis respecto a la tonalidad.
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
