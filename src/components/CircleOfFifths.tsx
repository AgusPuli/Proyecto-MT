import { useState } from 'react'
import { BUILT_IN_SCALES } from '../data/scales'
import type { NoteName, Scale } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CircleOfFifthsProps {
  root:           NoteName
  selectedScale:  Scale
  onRootChange:   (note: NoteName) => void
  onScaleChange:  (scale: Scale) => void
  synchronized:   boolean
  onSyncChange:   (sync: boolean) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Circle data — 12 positions, 30° intervals, 0° = C at top (12 o'clock)
// ─────────────────────────────────────────────────────────────────────────────

interface CircleEntry {
  angle:      number
  major:      string    // display (Spanish)
  minor:      string    // relative minor display (Spanish)
  majorNote:  NoteName
  minorNote:  NoteName
  sharps:     number
  flats:      number
  notes:      string[]  // 7 scale notes (Spanish)
}

const CIRCLE: CircleEntry[] = [
  { angle: 0,   major: 'Do',  minor: 'La',   majorNote: 'C',  minorNote: 'A',
    sharps: 0, flats: 0, notes: ['Do','Re','Mi','Fa','Sol','La','Si'] },
  { angle: 30,  major: 'Sol', minor: 'Mi',   majorNote: 'G',  minorNote: 'E',
    sharps: 1, flats: 0, notes: ['Sol','La','Si','Do','Re','Mi','Fa♯'] },
  { angle: 60,  major: 'Re',  minor: 'Si',   majorNote: 'D',  minorNote: 'B',
    sharps: 2, flats: 0, notes: ['Re','Mi','Fa♯','Sol','La','Si','Do♯'] },
  { angle: 90,  major: 'La',  minor: 'Fa♯',  majorNote: 'A',  minorNote: 'F#',
    sharps: 3, flats: 0, notes: ['La','Si','Do♯','Re','Mi','Fa♯','Sol♯'] },
  { angle: 120, major: 'Mi',  minor: 'Do♯',  majorNote: 'E',  minorNote: 'C#',
    sharps: 4, flats: 0, notes: ['Mi','Fa♯','Sol♯','La','Si','Do♯','Re♯'] },
  { angle: 150, major: 'Si',  minor: 'Sol♯', majorNote: 'B',  minorNote: 'G#',
    sharps: 5, flats: 0, notes: ['Si','Do♯','Re♯','Mi','Fa♯','Sol♯','La♯'] },
  { angle: 180, major: 'Fa♯', minor: 'Re♯',  majorNote: 'F#', minorNote: 'D#',
    sharps: 6, flats: 6, notes: ['Fa♯','Sol♯','La♯','Si','Do♯','Re♯','Mi♯'] },
  { angle: 210, major: 'Re♭', minor: 'Si♭',  majorNote: 'C#', minorNote: 'A#',
    sharps: 0, flats: 5, notes: ['Re♭','Mi♭','Fa','Sol♭','La♭','Si♭','Do'] },
  { angle: 240, major: 'La♭', minor: 'Fa',   majorNote: 'G#', minorNote: 'F',
    sharps: 0, flats: 4, notes: ['La♭','Si♭','Do','Re♭','Mi♭','Fa','Sol'] },
  { angle: 270, major: 'Mi♭', minor: 'Do',   majorNote: 'D#', minorNote: 'C',
    sharps: 0, flats: 3, notes: ['Mi♭','Fa','Sol','La♭','Si♭','Do','Re'] },
  { angle: 300, major: 'Si♭', minor: 'Sol',  majorNote: 'A#', minorNote: 'G',
    sharps: 0, flats: 2, notes: ['Si♭','Do','Re','Mi♭','Fa','Sol','La'] },
  { angle: 330, major: 'Fa',  minor: 'Re',   majorNote: 'F',  minorNote: 'D',
    sharps: 0, flats: 1, notes: ['Fa','Sol','La','Si♭','Do','Re','Mi'] },
]

/** Semitone value of each circle index's major root (C=0, C#=1, D=2 …) */
const CIRCLE_SEMITONES = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]

const NOTE_TO_INDEX: Record<NoteName, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5,
  'F#': 6, 'C#': 7, 'G#': 8, 'D#': 9, 'A#': 10, F: 11,
}

const CHORD_QUALITIES = ['M', 'm', 'm', 'M', 'M', 'm', '°'] as const
const ROMAN_NUMERALS  = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] as const

// ─────────────────────────────────────────────────────────────────────────────
// Theory constants
// ─────────────────────────────────────────────────────────────────────────────

/** Semitone offset → mode name (major-scale degrees) */
const MODE_FROM_OFFSET: Record<number, string> = {
  0: 'Ionio', 2: 'Dorio', 4: 'Frigio', 5: 'Lidio',
  7: 'Mixolidio', 9: 'Eólico', 11: 'Locrio',
}
/** Mode name → description */
const MODE_DESC: Record<string, string> = {
  'Ionio':      'Mayor estándar — brillante, estable',
  'Lidio':      'Mayor con 4ª aumentada — etéreo, flotante',
  'Mixolidio':  'Mayor con 7ª menor — dominante, rock/blues',
  'Dorio':      'Menor con 6ª mayor — oscuro pero groovy (funk/jazz)',
  'Eólico':     'Menor natural — oscuro, melancólico',
  'Frigio':     'Menor con 2ª menor — muy oscuro, flamenco/metal',
  'Locrio':     'Disminuido — extremadamente tenso, inestable',
}
/** Mode name → color class */
const MODE_COLOR: Record<string, { txt: string; bg: string }> = {
  'Ionio':     { txt: 'text-amber-300',   bg: 'bg-amber-900/30 border-amber-700/40' },
  'Lidio':     { txt: 'text-emerald-300', bg: 'bg-emerald-900/30 border-emerald-700/40' },
  'Mixolidio': { txt: 'text-cyan-300',    bg: 'bg-cyan-900/30 border-cyan-700/40' },
  'Dorio':     { txt: 'text-violet-300',  bg: 'bg-violet-900/30 border-violet-700/40' },
  'Eólico':    { txt: 'text-pink-300',    bg: 'bg-pink-900/30 border-pink-700/40' },
  'Frigio':    { txt: 'text-red-300',     bg: 'bg-red-900/30 border-red-700/40' },
  'Locrio':    { txt: 'text-gray-400',    bg: 'bg-gray-800/60 border-gray-700/40' },
}
const MODE_ORDER = ['Ionio','Lidio','Mixolidio','Dorio','Eólico','Frigio','Locrio']

// ─────────────────────────────────────────────────────────────────────────────
// Distance/mode helpers
// ─────────────────────────────────────────────────────────────────────────────

function circleDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 12
  return Math.min(d, 12 - d)
}

/** CW steps from a to b (0–11) */
function cwSteps(from: number, to: number): number {
  return (to - from + 12) % 12
}

/**
 * For each of the 7 modes, find which circle index is the parent key
 * when the root is rootIdx.
 */
function computeModeKeys(rootIdx: number): Array<{ mode: string; keyIdx: number; dist: number; dir: 'CW'|'CCW'|'—' }> {
  const sRoot = CIRCLE_SEMITONES[rootIdx]
  return MODE_ORDER.map(modeName => {
    const modeOffset = Number(Object.keys(MODE_FROM_OFFSET).find(k => MODE_FROM_OFFSET[Number(k)] === modeName))
    const targetSemitone = (sRoot - modeOffset + 12) % 12
    const keyIdx = CIRCLE_SEMITONES.indexOf(targetSemitone)
    const cw  = cwSteps(rootIdx, keyIdx)
    const ccw = cwSteps(keyIdx, rootIdx)
    const dist = Math.min(cw, ccw)
    const dir: 'CW'|'CCW'|'—' = dist === 0 ? '—' : cw <= ccw ? 'CW' : 'CCW'
    return { mode: modeName, keyIdx, dist, dir }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG geometry helpers
// ─────────────────────────────────────────────────────────────────────────────

const CX = 250, CY = 250
const R_LABEL_MAJOR = 218
const R_LABEL_MINOR = 180
const R_ARC_OUTER   = 162
const R_ARC_INNER   = 124
const R_ACC         = 100
const R_CENTER      = 78
const GAP = 2.2

function polar(r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

function sector(rOuter: number, rInner: number, angleDeg: number): string {
  const a0 = angleDeg - 15 + GAP, a1 = angleDeg + 15 - GAP
  const [x0o, y0o] = polar(rOuter, a0), [x1o, y1o] = polar(rOuter, a1)
  const [x0i, y0i] = polar(rInner, a0), [x1i, y1i] = polar(rInner, a1)
  return [
    `M ${x0o} ${y0o}`, `A ${rOuter} ${rOuter} 0 0 1 ${x1o} ${y1o}`,
    `L ${x1i} ${y1i}`, `A ${rInner} ${rInner} 0 0 0 ${x0i} ${y0i}`, 'Z',
  ].join(' ')
}

/** Fill colour for a sector by its distance from selected key */
function distFill(dist: number): string {
  switch (dist) {
    case 0: return '#92400e'  // amber: selected
    case 1: return '#0d3d38'  // teal: neighbours
    case 2: return '#1a3a5c'  // blue: 2 steps
    case 3: return '#1e2d45'  // steel: 3 steps
    case 4: return '#1c2838'  // dark: 4 steps
    case 5: return '#181f2e'  // very dark: 5 steps
    case 6: return '#3b1515'  // red: tritone
    default: return '#1e293b'
  }
}
function distLabel(dist: number): { color: string; label: string } {
  switch (dist) {
    case 1: return { color: '#2dd4bf', label: '6/7 notas' }
    case 2: return { color: '#60a5fa', label: '5/7 notas' }
    case 3: return { color: '#a0aec0', label: '4/7 notas' }
    case 4: return { color: '#718096', label: '3/7 notas' }
    case 5: return { color: '#4a5568', label: '2/7 notas' }
    case 6: return { color: '#f87171', label: '1/7 notas' }
    default: return { color: '#fbbf24', label: '7/7 notas' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Theory modal
// ─────────────────────────────────────────────────────────────────────────────

function TheoryModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-5 py-3 border-b border-gray-800">
          <span className="font-black text-amber-400 text-base">📚 Teoría del Círculo de Quintas</span>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-gray-300 text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm text-gray-300">

          <section>
            <h3 className="text-amber-400 font-black text-base mb-2">¿Qué es el Círculo de Quintas?</h3>
            <p className="text-gray-400 leading-relaxed">
              El círculo de quintas organiza las 12 tonalidades musicales de modo que cada posición adyacente
              comparte <strong className="text-white">6 de 7 notas</strong>. Es la herramienta más poderosa
              de la teoría occidental para entender relaciones entre tonalidades, acordes y escalas.
              Se llama "de quintas" porque cada paso en sentido horario sube una <strong className="text-white">quinta
              justa</strong> (7 semitonos): Do → Sol → Re → La → Mi → Si…
            </p>
          </section>

          <section>
            <h3 className="text-amber-400 font-black text-base mb-3">¿Cómo leerlo?</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-teal-900/30 border border-teal-800/40 rounded-xl p-3">
                <p className="text-teal-300 font-bold text-xs mb-1">⟶ Sentido horario (sostenidos)</p>
                <p className="text-gray-400 text-xs">Cada paso agrega un sostenido (#). El sonido se vuelve progresivamente más "brillante".</p>
              </div>
              <div className="bg-blue-900/30 border border-blue-800/40 rounded-xl p-3">
                <p className="text-blue-300 font-bold text-xs mb-1">⟵ Sentido antihorario (bemoles)</p>
                <p className="text-gray-400 text-xs">Cada paso agrega un bemol (♭). El sonido se vuelve progresivamente más "oscuro".</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-amber-400 font-black text-base mb-3">Distancias y notas en común</h3>
            <div className="space-y-1.5">
              {[
                { dist: 1, clr: '#2dd4bf', shared: '6/7', rel: 'Dominante / Subdominante — fácil modular' },
                { dist: 2, clr: '#60a5fa', shared: '5/7', rel: 'Muy cerca — buen material para préstamos' },
                { dist: 3, clr: '#a0aec0', shared: '4/7', rel: 'Moderadamente relacionadas' },
                { dist: 4, clr: '#718096', shared: '3/7', rel: 'Lejanas — contraste notable' },
                { dist: 5, clr: '#4a5568', shared: '2/7', rel: 'Muy lejanas — mucho contraste' },
                { dist: 6, clr: '#f87171', shared: '1/7', rel: 'Tritono — MÁXIMO contraste, más disonante' },
              ].map(r => (
                <div key={r.dist} className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-800/40">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.clr }} />
                  <span className="text-xs font-mono text-gray-500 w-8">{r.dist} paso{r.dist>1?'s':''}</span>
                  <span className="font-bold text-xs" style={{ color: r.clr }}>{r.shared}</span>
                  <span className="text-gray-500 text-xs">{r.rel}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-amber-400 font-black text-base mb-3">Los 7 modos y el círculo</h3>
            <p className="text-gray-500 text-xs mb-2">Cada modo tiene una "tonalidad madre" en el círculo. Cuanto más a la izquierda (bemoles), más oscuro el modo.</p>
            <div className="space-y-1.5">
              {[
                { mode: 'Lidio',      steps: '1 paso ⟶',  clr: '#34d399', desc: '+1 sostenido — más brillante que el mayor' },
                { mode: 'Ionio',      steps: 'centro',    clr: '#fbbf24', desc: 'Mayor estándar' },
                { mode: 'Mixolidio', steps: '1 paso ⟵',  clr: '#60a5fa', desc: '-1 bemol — base del rock y blues' },
                { mode: 'Dorio',      steps: '2 pasos ⟵', clr: '#a78bfa', desc: '-2 bemoles — groovy, funk/jazz (Sultans of Swing)' },
                { mode: 'Eólico',     steps: '3 pasos ⟵', clr: '#f472b6', desc: '-3 bemoles — menor natural' },
                { mode: 'Frigio',     steps: '4 pasos ⟵', clr: '#f87171', desc: '-4 bemoles — oscuro, flamenco/metal' },
                { mode: 'Locrio',     steps: '5 pasos ⟵', clr: '#9ca3af', desc: '-5 bemoles — inestable, muy raro' },
              ].map(r => (
                <div key={r.mode} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/40">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.clr }} />
                  <span className="font-bold text-xs w-20 flex-shrink-0" style={{ color: r.clr }}>{r.mode}</span>
                  <span className="text-gray-600 text-xs w-20 flex-shrink-0">{r.steps}</span>
                  <span className="text-gray-400 text-xs">{r.desc}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-amber-400 font-black text-base mb-3">Para el bajista 🎸</h3>
            <div className="space-y-3">
              <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/40">
                <p className="font-bold text-teal-300 text-xs mb-1">I - IV - V: La base de todo</p>
                <p className="text-gray-400 text-xs">Las 3 tonalidades adyacentes forman la progresión universal del blues y el rock. El IV está 1 paso a la izquierda, el V a la derecha.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/40">
                <p className="font-bold text-violet-300 text-xs mb-1">ii - V - I: La cadencia del jazz</p>
                <p className="text-gray-400 text-xs">Desciende por el círculo: cada acorde es la dominante del siguiente. Ejemplo en Do: Rem7 → Sol7 → DoMaj7. La base del walking bass.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/40">
                <p className="font-bold text-red-300 text-xs mb-1">Sustitución de tritono</p>
                <p className="text-gray-400 text-xs">Reemplazar el acorde V7 con el acorde a 6 pasos (opuesto). Ej: Sol7 → Re♭7 en Do mayor. Crea una línea de bajo cromática descendente: Re → Re♭ → Do.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/40">
                <p className="font-bold text-cyan-300 text-xs mb-1">Modulación suave</p>
                <p className="text-gray-400 text-xs">Para cambiar de tonalidad sin que "suene raro", moverse 1-2 pasos en el círculo. Cuantos más pasos, más dramático el cambio. El tritono es el cambio más extremo posible.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-amber-400 font-black text-base mb-3">El tritono — La máxima tensión</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              El tritono (6 pasos) es el intervalo más disonante de la música occidental. Divide la octava
              exactamente en dos mitades. Entre Do mayor y Fa♯ mayor solo hay <strong className="text-white">1 nota
              en común</strong> (Si = Do♭ enarmónico). En jazz, el tritono es la base de las cadencias dominantes:
              el intervalo entre la 3ª y la 7ª de un acorde dominante es un tritono, lo que crea la tensión que
              "exige" resolver al I.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Common progressions for the info panel
// ─────────────────────────────────────────────────────────────────────────────

interface Progression { name: string; roman: string; color: string; desc: string }
const PROGRESSIONS: Progression[] = [
  { name: 'I - IV - V - I',       roman: '1-4-5-1',     color: 'text-teal-300',   desc: 'Blues / Rock — La más usada en el mundo' },
  { name: 'I - vi - IV - V',      roman: '1-6-4-5',     color: 'text-amber-300',  desc: 'Pop / Doo-wop — Miles de hits modernos' },
  { name: 'ii - V - I',           roman: '2-5-1',        color: 'text-violet-300', desc: 'Jazz — Cadencia fundamental, walking bass' },
  { name: 'I - V - vi - IV',      roman: '1-5-6-4',     color: 'text-pink-300',   desc: '"Axis" — Axis of Awesome, 4 chords' },
  { name: 'I - IV - I - V',       roman: '12-bar blues', color: 'text-orange-300', desc: '12 compases de blues — base del rock' },
  { name: 'vi - IV - I - V',      roman: '6-4-1-5',     color: 'text-cyan-300',   desc: 'Minor pop — Emo, indie, baladas' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'tonalidad' | 'relaciones' | 'modos' | 'progresiones'

export default function CircleOfFifths({
  root, selectedScale, onRootChange, onScaleChange, synchronized, onSyncChange,
}: CircleOfFifthsProps) {
  const [hovered,   setHovered]   = useState<number | null>(null)
  const [localIdx,  setLocalIdx]  = useState<number>(NOTE_TO_INDEX[root] ?? 0)
  const [activeTab, setActiveTab] = useState<Tab>('tonalidad')
  const [showInfo,  setShowInfo]  = useState(false)

  const majorScale = BUILT_IN_SCALES.find(s => s.id === 'major')!

  const selectedIdx = synchronized ? (NOTE_TO_INDEX[root] ?? 0) : localIdx
  const entry       = CIRCLE[selectedIdx]

  function handleClick(idx: number) {
    if (synchronized) { onRootChange(CIRCLE[idx].majorNote); onScaleChange(majorScale) }
    else setLocalIdx(idx)
  }

  function accLabel(e: CircleEntry): string {
    if (e.sharps > 0 && e.flats > 0) return `${e.sharps}#/${e.flats}b`
    if (e.sharps > 0) return `${e.sharps}#`
    if (e.flats  > 0) return `${e.flats}b`
    return '○'
  }
  function armaduraText(e: CircleEntry): string {
    if (e.sharps === 0 && e.flats === 0) return 'Sin alteraciones'
    if (e.sharps > 0 && e.flats > 0) return `${e.sharps}♯ / ${e.flats}♭`
    if (e.sharps > 0) return `${e.sharps} sostenido${e.sharps > 1 ? 's' : ''}`
    return `${e.flats} bemol${e.flats > 1 ? 'es' : ''}`
  }

  // All 12 keys sorted by distance from selected
  const byDistance = Array.from({ length: 12 }, (_, i) => {
    const dist = circleDistance(selectedIdx, i)
    const cw   = cwSteps(selectedIdx, i)
    const ccw  = cwSteps(i, selectedIdx)
    return { idx: i, dist, dir: cw <= ccw ? '⟶' : '⟵', shared: Math.max(0, 7 - dist) }
  }).sort((a, b) => a.dist - b.dist || a.idx - b.idx)

  // Precompute mode keys for selected root
  const modeKeys = computeModeKeys(selectedIdx)

  // Relationship labels for specific distances
  const dominantIdx    = (selectedIdx + 1)  % 12
  const subdominantIdx = (selectedIdx + 11) % 12
  const tritoneIdx     = (selectedIdx + 6)  % 12
  const relativeMinIdx = selectedIdx  // minor is shown in entry.minor

  const tabs: { id: Tab; label: string }[] = [
    { id: 'tonalidad',    label: '🎵 Tonalidad' },
    { id: 'relaciones',   label: '🔗 Relaciones' },
    { id: 'modos',        label: '🎭 Modos' },
    { id: 'progresiones', label: '🎸 Progresiones' },
  ]

  return (
    <>
      {showInfo && <TheoryModal onClose={() => setShowInfo(false)} />}

      <div className="flex flex-wrap gap-4 items-start p-4 bg-gray-900 rounded-xl border border-gray-800">

        {/* ── SVG Circle ────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 500 500" width="440" height="440"
            className="select-none overflow-visible">

            {/* Background disc */}
            <circle cx={CX} cy={CY} r="235" fill="#0f172a" />

            {/* 12 sectors — coloured by distance */}
            {CIRCLE.map((e, i) => {
              const dist   = circleDistance(selectedIdx, i)
              const isSel  = i === selectedIdx
              const isHov  = i === hovered
              const fill   = isHov && !isSel
                ? '#334155'
                : distFill(dist)

              const majorTextColor = isSel ? '#fbbf24' : '#e2e8f0'
              const minorTextColor = isSel ? '#fcd34d' : '#94a3b8'
              const accColor       = isSel ? '#fbbf24' : distLabel(dist).color

              const [lmx, lmy] = polar(R_LABEL_MAJOR, e.angle)
              const [lnx, lny] = polar(R_LABEL_MINOR, e.angle)
              const [lax, lay] = polar(R_ACC, e.angle)

              return (
                <g key={i} style={{ cursor: 'pointer' }}
                  onClick={() => handleClick(i)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}>
                  <path d={sector(R_ARC_OUTER, R_ARC_INNER, e.angle)}
                    fill={fill} stroke="#0f172a" strokeWidth={1.5}
                    style={{ transition: 'fill 0.15s ease' }} />
                  <text x={lmx} y={lmy} textAnchor="middle" dominantBaseline="middle"
                    fill={majorTextColor} fontSize={isSel ? 14 : 12}
                    fontWeight={isSel ? '800' : '600'} style={{ userSelect: 'none' }}>
                    {e.major} M
                  </text>
                  <text x={lnx} y={lny} textAnchor="middle" dominantBaseline="middle"
                    fill={minorTextColor} fontSize={isSel ? 11 : 10}
                    fontWeight={isSel ? '700' : '400'} style={{ userSelect: 'none' }}>
                    {e.minor} m
                  </text>
                  <text x={lax} y={lay} textAnchor="middle" dominantBaseline="middle"
                    fill={accColor} fontSize={9} fontWeight="600" style={{ userSelect: 'none' }}>
                    {accLabel(e)}
                  </text>
                </g>
              )
            })}

            {/* Hover tooltip ring (shows shared note count) */}
            {hovered !== null && hovered !== selectedIdx && (() => {
              const he    = CIRCLE[hovered]
              const dist  = circleDistance(selectedIdx, hovered)
              const info  = distLabel(dist)
              const [tx, ty] = polar(R_ARC_OUTER + 20, he.angle)
              return (
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                  fontSize={9} fontWeight="700" fill={info.color}
                  style={{ pointerEvents: 'none' }}>
                  {info.label}
                </text>
              )
            })()}

            {/* Center circle */}
            <circle cx={CX} cy={CY} r={R_CENTER} fill="#030712" stroke="#1e293b" strokeWidth={2} />
            <text x={CX} y={CY - 16} textAnchor="middle" fill="#fbbf24"
              fontSize={22} fontWeight="800" style={{ userSelect: 'none' }}>
              {entry.major} M
            </text>
            <text x={CX} y={CY + 6} textAnchor="middle" fill="#64748b"
              fontSize={11} style={{ userSelect: 'none' }}>
              rel. {entry.minor} m
            </text>
            <text x={CX} y={CY + 22} textAnchor="middle" fill="#475569"
              fontSize={10} style={{ userSelect: 'none' }}>
              {armaduraText(entry)}
            </text>
          </svg>

          {/* Legend */}
          <div className="flex gap-3 text-[10px] text-gray-600">
            {[
              { color: '#2dd4bf', label: '1 paso (6/7)' },
              { color: '#60a5fa', label: '2 pasos (5/7)' },
              { color: '#f87171', label: 'tritono (1/7)' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                <span>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button onClick={() => onSyncChange(!synchronized)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${synchronized
                ? 'bg-teal-700/80 text-teal-100 hover:bg-teal-700'
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'}`}>
              {synchronized ? '⟳ Sincronizado' : '⟳ Sincronizar'}
            </button>
            <button onClick={() => setShowInfo(true)} title="Teoría del Círculo de Quintas"
              className="text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-800 text-gray-500 hover:bg-amber-900/40 hover:text-amber-300 transition-colors">
              ℹ️ Teoría
            </button>
          </div>
        </div>

        {/* ── Info panel with tabs ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-[260px] flex flex-col gap-3">

          {/* Tabs */}
          <div className="flex gap-1 flex-wrap">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${activeTab === t.id
                  ? 'bg-amber-900/50 text-amber-300'
                  : 'bg-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Tonalidad ── */}
          {activeTab === 'tonalidad' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-amber-400">{entry.major} Mayor</h3>
                <p className="text-xs text-gray-500">
                  Menor relativa: <span className="text-gray-300 font-semibold">{entry.minor} menor</span>
                  <span className="mx-2 text-gray-700">·</span>
                  {armaduraText(entry)}
                </p>
                {selectedScale.id !== 'major' && (
                  <p className="text-xs text-teal-500 mt-0.5">
                    Escala activa: <span className="font-semibold text-teal-300">{selectedScale.name}</span>
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Notas de {entry.major} Mayor</p>
                <div className="flex flex-wrap gap-1.5">
                  {entry.notes.map((note, i) => (
                    <span key={i} className={`px-2.5 py-1 rounded-md text-xs font-bold border ${i === 0
                      ? 'bg-amber-900/50 text-amber-400 border-amber-700/50'
                      : 'bg-gray-800 text-gray-300 border-gray-700/40'}`}>
                      {note}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Acordes diatónicos</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {entry.notes.map((note, i) => {
                    const q = CHORD_QUALITIES[i]
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-gray-600 font-mono text-[11px] w-8 shrink-0">{ROMAN_NUMERALS[i]}</span>
                        <span className={`text-sm font-semibold ${q === 'M' ? 'text-teal-400' : q === 'm' ? 'text-blue-400' : 'text-red-400'}`}>
                          {note} {q}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Relaciones ── */}
          {activeTab === 'relaciones' && (
            <div className="space-y-4">
              {/* Key named relationships */}
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Relaciones clave</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Relativa menor', name: `${entry.minor} m`, desc: 'Mismas notas, diferente centro tonal', color: 'text-pink-300', bg: 'bg-pink-900/20 border-pink-900/30' },
                    { label: 'Dominante (V) ⟶+1♯', name: `${CIRCLE[dominantIdx].major} M`, desc: '6/7 notas — tensión que resuelve al I', color: 'text-teal-300', bg: 'bg-teal-900/20 border-teal-900/30' },
                    { label: 'Subdominante (IV) ⟵-1♭', name: `${CIRCLE[subdominantIdx].major} M`, desc: '6/7 notas — complementa la tónica', color: 'text-cyan-300', bg: 'bg-cyan-900/20 border-cyan-900/30' },
                    { label: 'Parallel menor', name: `${entry.major} m`, desc: 'Misma raíz, escala menor — préstamo modal', color: 'text-blue-300', bg: 'bg-blue-900/20 border-blue-900/30' },
                    { label: 'Tritono (opuesto) ⚡', name: `${CIRCLE[tritoneIdx].major} M`, desc: '1/7 nota — máximo contraste y tensión', color: 'text-red-400', bg: 'bg-red-900/20 border-red-900/30' },
                  ].map(r => (
                    <div key={r.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${r.bg}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-600">{r.label}</p>
                        <p className={`font-black text-sm ${r.color}`}>{r.name}</p>
                        <p className="text-[10px] text-gray-600">{r.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* All 12 keys by proximity */}
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">
                  Todas las tonalidades — más cercana a más lejana
                </p>
                <div className="space-y-1">
                  {byDistance.filter(k => k.idx !== selectedIdx).map(k => {
                    const ke    = CIRCLE[k.idx]
                    const info  = distLabel(k.dist)
                    const rel   = k.idx === dominantIdx    ? 'Dominante'
                      : k.idx === subdominantIdx ? 'Subdominante'
                      : k.idx === tritoneIdx     ? '⚡ Tritono'
                      : k.idx === relativeMinIdx ? '' : ''
                    return (
                      <div key={k.idx}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800/40 hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => handleClick(k.idx)}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: info.color }} />
                        <span className="font-bold text-xs text-gray-200 w-14 shrink-0">{ke.major} M</span>
                        <span className="text-[10px] text-gray-600 w-8">{k.dir}{k.dist}</span>
                        <span className="text-[10px] font-semibold" style={{ color: info.color }}>{k.shared}/7</span>
                        {rel && <span className="text-[10px] text-gray-600 ml-auto">{rel}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Modos ── */}
          {activeTab === 'modos' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Modos de <span className="text-amber-400 font-bold">{entry.major}</span> — cada modo usa las notas de otra tonalidad madre del círculo.
              </p>
              <div className="space-y-2">
                {modeKeys.map(mk => {
                  const ke    = CIRCLE[mk.keyIdx]
                  const mc    = MODE_COLOR[mk.mode] ?? { txt: 'text-gray-300', bg: 'bg-gray-800/40 border-gray-700/30' }
                  const stepLabel = mk.dist === 0 ? 'Esta tonalidad'
                    : `${mk.dist} paso${mk.dist > 1 ? 's' : ''} ${mk.dir === 'CW' ? '⟶' : '⟵'}`
                  return (
                    <div key={mk.mode} className={`p-3 rounded-xl border ${mc.bg}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-black text-sm ${mc.txt}`}>{entry.major} {mk.mode}</span>
                        <span className="text-[10px] text-gray-600 ml-auto">{stepLabel}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mb-1">{MODE_DESC[mk.mode]}</p>
                      <p className="text-[10px] text-gray-700">
                        Usa las notas de{' '}
                        <span className="text-gray-400 font-semibold">{ke.major} Mayor</span>
                        {mk.dist > 0 && (
                          <> · {ke.sharps > 0 ? `${ke.sharps}♯` : ke.flats > 0 ? `${ke.flats}♭` : 'Sin ♯♭'}</>
                        )}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Tab: Progresiones ── */}
          {activeTab === 'progresiones' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Progresiones en <span className="text-amber-400 font-bold">{entry.major} Mayor</span> — con los acordes de esta tonalidad.
              </p>
              {PROGRESSIONS.map(prog => {
                // Map roman numerals to actual chords
                const degreeMap: Record<string, string> = {
                  'I':    `${entry.notes[0]} M`,
                  'ii':   `${entry.notes[1]} m`,
                  'iii':  `${entry.notes[2]} m`,
                  'IV':   `${entry.notes[3]} M`,
                  'V':    `${entry.notes[4]} M`,
                  'vi':   `${entry.notes[5]} m`,
                  'vii°': `${entry.notes[6]} °`,
                }
                const chords = prog.name.split(' - ')
                  .map(r => degreeMap[r.trim()] ?? r.trim())
                  .join(' → ')

                return (
                  <div key={prog.name} className="bg-gray-800/50 border border-gray-700/40 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-black ${prog.color}`}>{prog.name}</span>
                    </div>
                    <p className="font-mono text-xs text-gray-300 mb-1">{chords}</p>
                    <p className="text-[10px] text-gray-600">{prog.desc}</p>
                  </div>
                )
              })}

              {/* Circle of fifths walking bass tip */}
              <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-3">
                <p className="text-amber-300 font-bold text-xs mb-1">💡 Walking Bass — ii-V-I en {entry.major}</p>
                <p className="font-mono text-xs text-gray-300 mb-1">
                  {entry.notes[1]} m7 → {entry.notes[4]} 7 → {entry.notes[0]} Maj7
                </p>
                <p className="text-[10px] text-gray-500">
                  Desciende por el círculo. El bajo camina: raíz → 3ª → 5ª → 7ª de cada acorde,
                  con notas de approach cromáticas hacia la siguiente tónica.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
