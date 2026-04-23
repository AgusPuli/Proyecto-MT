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
  angle:     number
  major:     string
  minor:     string
  majorNote: NoteName
  minorNote: NoteName
  sharps:    number
  flats:     number
  notes:     string[]
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

const MODE_FROM_OFFSET: Record<number, string> = {
  0: 'Ionio', 2: 'Dorio', 4: 'Frigio', 5: 'Lidio',
  7: 'Mixolidio', 9: 'Eólico', 11: 'Locrio',
}
const MODE_DESC: Record<string, string> = {
  'Ionio':      'Mayor estándar — brillante, estable',
  'Lidio':      'Mayor con 4ª aumentada — etéreo, flotante',
  'Mixolidio':  'Mayor con 7ª menor — dominante, rock/blues',
  'Dorio':      'Menor con 6ª mayor — oscuro pero groovy (funk/jazz)',
  'Eólico':     'Menor natural — oscuro, melancólico',
  'Frigio':     'Menor con 2ª menor — muy oscuro, flamenco/metal',
  'Locrio':     'Disminuido — extremadamente tenso, inestable',
}
const MODE_COLOR: Record<string, { txt: string; bg: string }> = {
  'Ionio':     { txt: 'text-amber-300',   bg: 'bg-amber-900/30 border-amber-700/40' },
  'Lidio':     { txt: 'text-emerald-300', bg: 'bg-emerald-900/30 border-emerald-700/40' },
  'Mixolidio': { txt: 'text-cyan-300',    bg: 'bg-cyan-900/30 border-cyan-700/40' },
  'Dorio':     { txt: 'text-violet-300',  bg: 'bg-violet-900/30 border-violet-700/40' },
  'Eólico':    { txt: 'text-pink-300',    bg: 'bg-pink-900/30 border-pink-900/30' },
  'Frigio':    { txt: 'text-red-300',     bg: 'bg-red-900/30 border-red-900/30' },
  'Locrio':    { txt: 'text-gray-400',    bg: 'bg-gray-800/60 border-gray-700/40' },
}
const MODE_ORDER = ['Ionio','Lidio','Mixolidio','Dorio','Eólico','Frigio','Locrio']

// ─────────────────────────────────────────────────────────────────────────────
// Distance / mode helpers
// ─────────────────────────────────────────────────────────────────────────────

function circleDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 12
  return Math.min(d, 12 - d)
}
function cwSteps(from: number, to: number): number {
  return (to - from + 12) % 12
}

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
// Theme-aware color helpers — return CSS custom property references
// SVG fill/stroke and HTML style props both support var(--*)
// ─────────────────────────────────────────────────────────────────────────────

function distFill(dist: number): string {
  const vars = ['--circle-d0','--circle-d1','--circle-d2','--circle-d3','--circle-d4','--circle-d5','--circle-d6']
  return `var(${vars[Math.min(dist, 6)]})`
}

function distLabelColor(dist: number): string {
  const vars = ['--circle-label-d0','--circle-label-d1','--circle-label-d2',
                '--circle-label-d3','--circle-label-d4','--circle-label-d5','--circle-label-d6']
  return `var(${vars[Math.min(dist, 6)]})`
}

function distLabel(dist: number): { color: string; label: string } {
  const labels = ['7/7 notas','6/7 notas','5/7 notas','4/7 notas','3/7 notas','2/7 notas','1/7 notas']
  return { color: distLabelColor(dist), label: labels[Math.min(dist, 6)] }
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG geometry
// ─────────────────────────────────────────────────────────────────────────────

const CX = 250, CY = 250
const R_OUTER_DECO   = 242   // decorative tick ring
const R_LABEL_MAJOR  = 218
const R_LABEL_MINOR  = 182
const R_ARC_OUTER    = 162
const R_ARC_INNER    = 124
const R_ACC          = 100
const R_CENTER       = 78
const GAP = 2.5

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
              El círculo de quintas organiza las 12 tonalidades de forma que cada posición adyacente
              comparte <strong className="text-white">6 de 7 notas</strong>. Es la herramienta más poderosa
              de la teoría occidental. Se llama "de quintas" porque cada paso horario sube una{' '}
              <strong className="text-white">quinta justa</strong> (7 semitonos): Do → Sol → Re → La…
            </p>
          </section>

          <section>
            <h3 className="text-amber-400 font-black text-base mb-3">¿Cómo leerlo?</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-teal-900/30 border border-teal-800/40 rounded-xl p-3">
                <p className="text-teal-300 font-bold text-xs mb-1">⟶ Sentido horario (sostenidos)</p>
                <p className="text-gray-400 text-xs">Cada paso agrega un ♯. El sonido se vuelve más "brillante".</p>
              </div>
              <div className="bg-blue-900/30 border border-blue-800/40 rounded-xl p-3">
                <p className="text-blue-300 font-bold text-xs mb-1">⟵ Sentido antihorario (bemoles)</p>
                <p className="text-gray-400 text-xs">Cada paso agrega un ♭. El sonido se vuelve más "oscuro".</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-amber-400 font-black text-base mb-3">Distancias y notas en común</h3>
            <div className="space-y-1.5">
              {[
                { dist: 1, cvar: '--circle-label-d1', shared: '6/7', rel: 'Dominante / Subdominante — fácil modular' },
                { dist: 2, cvar: '--circle-label-d2', shared: '5/7', rel: 'Muy cerca — buen material para préstamos' },
                { dist: 3, cvar: '--circle-label-d3', shared: '4/7', rel: 'Moderadamente relacionadas' },
                { dist: 4, cvar: '--circle-label-d4', shared: '3/7', rel: 'Lejanas — contraste notable' },
                { dist: 5, cvar: '--circle-label-d5', shared: '2/7', rel: 'Muy lejanas — mucho contraste' },
                { dist: 6, cvar: '--circle-label-d6', shared: '1/7', rel: 'Tritono — MÁXIMO contraste, más disonante' },
              ].map(r => (
                <div key={r.dist} className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-800/40">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: `var(${r.cvar})` }} />
                  <span className="text-xs font-mono text-gray-500 w-8">{r.dist} paso{r.dist>1?'s':''}</span>
                  <span className="font-bold text-xs" style={{ color: `var(${r.cvar})` }}>{r.shared}</span>
                  <span className="text-gray-500 text-xs">{r.rel}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-amber-400 font-black text-base mb-3">Los 7 modos y el círculo</h3>
            <p className="text-gray-500 text-xs mb-2">Cada modo tiene una "tonalidad madre". Más a la izquierda → más oscuro.</p>
            <div className="space-y-1.5">
              {[
                { mode: 'Lidio',      steps: '1 paso ⟶',  cvar: '--circle-label-d1', desc: '+1 sostenido — más brillante que el mayor' },
                { mode: 'Ionio',      steps: 'centro',    cvar: '--circle-label-d0', desc: 'Mayor estándar' },
                { mode: 'Mixolidio', steps: '1 paso ⟵',  cvar: '--circle-label-d2', desc: '-1 bemol — base del rock y blues' },
                { mode: 'Dorio',      steps: '2 pasos ⟵', cvar: '--circle-label-d3', desc: '-2 bemoles — groovy, funk/jazz' },
                { mode: 'Eólico',     steps: '3 pasos ⟵', cvar: '--circle-label-d6', desc: '-3 bemoles — menor natural' },
                { mode: 'Frigio',     steps: '4 pasos ⟵', cvar: '--circle-label-d6', desc: '-4 bemoles — oscuro, flamenco/metal' },
                { mode: 'Locrio',     steps: '5 pasos ⟵', cvar: '--circle-label-d5', desc: '-5 bemoles — inestable, muy raro' },
              ].map(r => (
                <div key={r.mode} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/40">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: `var(${r.cvar})` }} />
                  <span className="font-bold text-xs w-20 flex-shrink-0" style={{ color: `var(${r.cvar})` }}>{r.mode}</span>
                  <span className="text-gray-600 text-xs w-20 flex-shrink-0">{r.steps}</span>
                  <span className="text-gray-400 text-xs">{r.desc}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-amber-400 font-black text-base mb-3">Para el bajista 🎸</h3>
            <div className="space-y-3">
              {[
                { title: 'I - IV - V: La base de todo', color: 'text-teal-300', text: 'Las 3 tonalidades adyacentes forman la progresión universal del blues/rock. El IV está 1 paso a la izquierda, el V a la derecha.' },
                { title: 'ii - V - I: La cadencia del jazz', color: 'text-violet-300', text: 'Desciende por el círculo: Rem7 → Sol7 → DoMaj7 en Do. La base del walking bass.' },
                { title: 'Sustitución de tritono', color: 'text-red-300', text: 'Reemplazar V7 con el acorde opuesto. Ej: Sol7 → Re♭7 en Do. Crea línea de bajo cromática descendente.' },
                { title: 'Modulación suave', color: 'text-cyan-300', text: '1-2 pasos = modular sutilmente. El tritono = cambio más dramático posible.' },
              ].map(tip => (
                <div key={tip.title} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/40">
                  <p className={`font-bold text-xs mb-1 ${tip.color}`}>{tip.title}</p>
                  <p className="text-gray-400 text-xs">{tip.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-amber-400 font-black text-base mb-3">El tritono — La máxima tensión</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              6 pasos — el intervalo más disonante. Divide la octava en dos mitades exactas.
              Entre Do mayor y Fa♯ mayor solo hay <strong className="text-white">1 nota en común</strong>.
              En jazz, el tritono entre 3ª y 7ª de un acorde dominante genera la tensión que "exige" resolver al I.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Progressions
// ─────────────────────────────────────────────────────────────────────────────

interface Progression { name: string; color: string; desc: string }
const PROGRESSIONS: Progression[] = [
  { name: 'I - IV - V - I',  color: 'text-teal-300',   desc: 'Blues / Rock — La más usada en el mundo' },
  { name: 'I - vi - IV - V', color: 'text-amber-300',  desc: 'Pop / Doo-wop — Miles de hits modernos' },
  { name: 'ii - V - I',      color: 'text-violet-300', desc: 'Jazz — Cadencia fundamental, walking bass' },
  { name: 'I - V - vi - IV', color: 'text-pink-300',   desc: '"Axis" — Axis of Awesome, 4 chords' },
  { name: 'I - IV - I - V',  color: 'text-orange-300', desc: '12-bar blues — base del rock' },
  { name: 'vi - IV - I - V', color: 'text-cyan-300',   desc: 'Minor pop — Emo, indie, baladas' },
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
    if (e.sharps > 0) return `${e.sharps}♯`
    if (e.flats  > 0) return `${e.flats}♭`
    return '○'
  }
  function armaduraText(e: CircleEntry): string {
    if (e.sharps === 0 && e.flats === 0) return 'Sin alteraciones'
    if (e.sharps > 0 && e.flats > 0) return `${e.sharps}♯ / ${e.flats}♭`
    if (e.sharps > 0) return `${e.sharps} sostenido${e.sharps > 1 ? 's' : ''}`
    return `${e.flats} bemol${e.flats > 1 ? 'es' : ''}`
  }

  const byDistance = Array.from({ length: 12 }, (_, i) => {
    const dist = circleDistance(selectedIdx, i)
    const cw   = cwSteps(selectedIdx, i)
    const ccw  = cwSteps(i, selectedIdx)
    return { idx: i, dist, dir: cw <= ccw ? '⟶' : '⟵', shared: Math.max(0, 7 - dist) }
  }).sort((a, b) => a.dist - b.dist || a.idx - b.idx)

  const modeKeys      = computeModeKeys(selectedIdx)
  const dominantIdx   = (selectedIdx + 1)  % 12
  const subdominantIdx= (selectedIdx + 11) % 12
  const tritoneIdx    = (selectedIdx + 6)  % 12

  const tabs: { id: Tab; label: string }[] = [
    { id: 'tonalidad',    label: '🎵 Tonalidad' },
    { id: 'relaciones',   label: '🔗 Relaciones' },
    { id: 'modos',        label: '🎭 Modos' },
    { id: 'progresiones', label: '🎸 Progresiones' },
  ]

  return (
    <>
      {showInfo && <TheoryModal onClose={() => setShowInfo(false)} />}

      <div className="flex flex-wrap gap-5 items-start p-5 bg-gray-900 rounded-2xl border border-gray-800">

        {/* ── SVG Circle ────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 500 500" width="440" height="440"
            className="select-none overflow-visible"
            style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.5))' }}>

            <defs>
              {/* Background gradient — dark centre radiating outward */}
              <radialGradient id="cof-bg" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="var(--circle-bg-inner)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--circle-bg)"       stopOpacity="1" />
              </radialGradient>
              {/* Center circle gradient */}
              <radialGradient id="cof-center" cx="35%" cy="35%" r="65%">
                <stop offset="0%"   stopColor="var(--circle-center-inner)" />
                <stop offset="100%" stopColor="var(--circle-center)" />
              </radialGradient>
              {/* Glow filter for selected sector outline */}
              <filter id="cof-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background disc */}
            <circle cx={CX} cy={CY} r="248" fill="url(#cof-bg)" />

            {/* Outer decorative ring */}
            <circle cx={CX} cy={CY} r={R_OUTER_DECO}
              fill="none" stroke="var(--circle-outer-ring)" strokeWidth="1.5" opacity="0.7" />

            {/* Tick marks at each key position */}
            {CIRCLE.map((_, i) => {
              const angle = i * 30
              const [x1, y1] = polar(R_OUTER_DECO - 7, angle)
              const [x2, y2] = polar(R_OUTER_DECO + 1, angle)
              return (
                <line key={`tick-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="var(--circle-outer-ring)" strokeWidth="2" opacity="0.8" />
              )
            })}

            {/* 12 sectors */}
            {CIRCLE.map((e, i) => {
              const dist  = circleDistance(selectedIdx, i)
              const isSel = i === selectedIdx
              const isHov = i === hovered
              const fill  = isHov && !isSel ? 'var(--circle-hover)' : distFill(dist)

              const majorTextColor = isSel ? 'var(--circle-text-selected)' : 'var(--circle-text-primary)'
              const minorTextColor = isSel ? 'var(--circle-text-selected)' : 'var(--circle-text-secondary)'
              const accColor       = isSel ? 'var(--circle-text-selected)' : distLabelColor(dist)

              const [lmx, lmy] = polar(R_LABEL_MAJOR, e.angle)
              const [lnx, lny] = polar(R_LABEL_MINOR, e.angle)
              const [lax, lay] = polar(R_ACC, e.angle)

              return (
                <g key={i} style={{ cursor: 'pointer' }}
                  onClick={() => handleClick(i)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}>

                  {/* Sector fill */}
                  <path d={sector(R_ARC_OUTER, R_ARC_INNER, e.angle)}
                    fill={fill}
                    stroke="var(--circle-bg)" strokeWidth="1.5"
                    style={{ transition: 'fill 0.2s ease' }} />

                  {/* Selected glow outline */}
                  {isSel && (
                    <path d={sector(R_ARC_OUTER, R_ARC_INNER, e.angle)}
                      fill="none"
                      stroke="var(--circle-text-selected)"
                      strokeWidth="2.5"
                      style={{
                        filter: 'url(#cof-glow)',
                        pointerEvents: 'none',
                        opacity: 0.85,
                      }} />
                  )}

                  {/* Hover subtle outline */}
                  {isHov && !isSel && (
                    <path d={sector(R_ARC_OUTER, R_ARC_INNER, e.angle)}
                      fill="none"
                      stroke="var(--circle-text-secondary)"
                      strokeWidth="1"
                      style={{ pointerEvents: 'none', opacity: 0.4 }} />
                  )}

                  {/* Major key label */}
                  <text x={lmx} y={lmy} textAnchor="middle" dominantBaseline="middle"
                    fill={majorTextColor}
                    fontSize={isSel ? 13.5 : 11.5}
                    fontWeight={isSel ? '800' : '600'}
                    style={{ userSelect: 'none', letterSpacing: isSel ? '0.02em' : '0' }}>
                    {e.major}
                  </text>

                  {/* Minor label */}
                  <text x={lnx} y={lny} textAnchor="middle" dominantBaseline="middle"
                    fill={minorTextColor}
                    fontSize={isSel ? 10.5 : 9.5}
                    fontWeight={isSel ? '700' : '400'}
                    style={{ userSelect: 'none' }}>
                    {e.minor} m
                  </text>

                  {/* Sharps / flats badge */}
                  <text x={lax} y={lay} textAnchor="middle" dominantBaseline="middle"
                    fill={accColor} fontSize={9} fontWeight="600"
                    style={{ userSelect: 'none' }}>
                    {accLabel(e)}
                  </text>
                </g>
              )
            })}

            {/* Hover tooltip — shared note count */}
            {hovered !== null && hovered !== selectedIdx && (() => {
              const he   = CIRCLE[hovered]
              const dist = circleDistance(selectedIdx, hovered)
              const info = distLabel(dist)
              const [tx, ty] = polar(R_ARC_OUTER + 22, he.angle)
              return (
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                  fontSize={9} fontWeight="700"
                  fill={info.color}
                  style={{ pointerEvents: 'none' }}>
                  {info.label}
                </text>
              )
            })()}

            {/* Inner divider ring between sectors and center */}
            <circle cx={CX} cy={CY} r={R_ARC_INNER}
              fill="none" stroke="var(--circle-bg)" strokeWidth="1.5" opacity="0.6" />

            {/* Center circle */}
            <circle cx={CX} cy={CY} r={R_CENTER}
              fill="url(#cof-center)"
              stroke="var(--circle-center-stroke)" strokeWidth="1.5" />

            {/* Center — key name */}
            <text x={CX} y={CY - 17} textAnchor="middle"
              fill="var(--circle-text-selected)"
              fontSize={24} fontWeight="900"
              style={{ userSelect: 'none', letterSpacing: '0.03em' }}>
              {entry.major}
            </text>

            {/* Center — relative minor */}
            <text x={CX} y={CY + 5} textAnchor="middle"
              fill="var(--circle-text-secondary)"
              fontSize={11}
              style={{ userSelect: 'none' }}>
              rel. {entry.minor} m
            </text>

            {/* Center — armadura */}
            <text x={CX} y={CY + 21} textAnchor="middle"
              fill="var(--circle-text-muted)"
              fontSize={9.5}
              style={{ userSelect: 'none' }}>
              {armaduraText(entry)}
            </text>
          </svg>

          {/* Legend */}
          <div className="flex gap-4 text-[10px] text-gray-600 flex-wrap justify-center">
            {[1, 2, 6].map(d => {
              const info = distLabel(d)
              return (
                <div key={d} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: info.color }} />
                  <span style={{ color: info.color }}>
                    {d === 6 ? 'tritono' : `${d} paso${d > 1 ? 's' : ''}`} ({info.label})
                  </span>
                </div>
              )
            })}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button onClick={() => onSyncChange(!synchronized)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${synchronized
                ? 'bg-teal-700/80 text-teal-100 hover:bg-teal-700'
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'}`}>
              {synchronized ? '⟳ Sincronizado' : '⟳ Sincronizar'}
            </button>
            <button onClick={() => setShowInfo(true)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-800 text-gray-500 hover:bg-amber-900/40 hover:text-amber-300 transition-colors">
              ℹ️ Teoría
            </button>
          </div>
        </div>

        {/* ── Info panel ──────────────────────────────────────────────────────── */}
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

          {/* ── TONALIDAD ── */}
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

          {/* ── RELACIONES ── */}
          {activeTab === 'relaciones' && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Relaciones clave</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Relativa menor',         name: `${entry.minor} m`,               desc: 'Mismas notas, diferente centro', color: 'text-pink-300',  bg: 'bg-pink-900/20 border-pink-900/30' },
                    { label: 'Dominante (V) ⟶ +1♯',   name: `${CIRCLE[dominantIdx].major} M`, desc: '6/7 notas — tensión que resuelve al I', color: 'text-teal-300',  bg: 'bg-teal-900/20 border-teal-900/30' },
                    { label: 'Subdominante (IV) ⟵ -1♭',name: `${CIRCLE[subdominantIdx].major} M`,desc: '6/7 notas — complementa la tónica', color: 'text-cyan-300',  bg: 'bg-cyan-900/20 border-cyan-900/30' },
                    { label: 'Parallel menor',         name: `${entry.major} m`,               desc: 'Misma raíz, escala menor', color: 'text-blue-300',  bg: 'bg-blue-900/20 border-blue-900/30' },
                    { label: 'Tritono (opuesto) ⚡',   name: `${CIRCLE[tritoneIdx].major} M`,  desc: '1/7 nota — máximo contraste', color: 'text-red-400',   bg: 'bg-red-900/20 border-red-900/30' },
                  ].map(r => (
                    <div key={r.label} className={`px-3 py-2 rounded-lg border ${r.bg}`}>
                      <p className="text-[10px] text-gray-600">{r.label}</p>
                      <p className={`font-black text-sm ${r.color}`}>{r.name}</p>
                      <p className="text-[10px] text-gray-600">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">
                  Todas — más cercana a más lejana
                </p>
                <div className="space-y-1">
                  {byDistance.filter(k => k.idx !== selectedIdx).map(k => {
                    const ke   = CIRCLE[k.idx]
                    const info = distLabel(k.dist)
                    const rel  = k.idx === dominantIdx ? 'Dominante'
                      : k.idx === subdominantIdx ? 'Subdominante'
                      : k.idx === tritoneIdx     ? '⚡ Tritono'
                      : ''
                    return (
                      <div key={k.idx}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800/40 hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => handleClick(k.idx)}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: info.color }} />
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

          {/* ── MODOS ── */}
          {activeTab === 'modos' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Modos de <span className="text-amber-400 font-bold">{entry.major}</span> — cada modo usa las notas de una tonalidad madre del círculo.
              </p>
              <div className="space-y-2">
                {modeKeys.map(mk => {
                  const ke    = CIRCLE[mk.keyIdx]
                  const mc    = MODE_COLOR[mk.mode] ?? { txt: 'text-gray-300', bg: 'bg-gray-800/40 border-gray-700/30' }
                  const stepLabel = mk.dist === 0 ? 'Esta tonalidad'
                    : `${mk.dist} paso${mk.dist > 1 ? 's' : ''} ${mk.dir === 'CW' ? '⟶' : '⟵'}`
                  return (
                    <div key={mk.mode} className={`p-3 rounded-xl border ${mc.bg}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-black text-sm ${mc.txt}`}>{entry.major} {mk.mode}</span>
                        <span className="text-[10px] text-gray-600 ml-auto">{stepLabel}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mb-1">{MODE_DESC[mk.mode]}</p>
                      <p className="text-[10px] text-gray-700">
                        Notas de <span className="text-gray-400 font-semibold">{ke.major} Mayor</span>
                        {mk.dist > 0 && <> · {ke.sharps > 0 ? `${ke.sharps}♯` : ke.flats > 0 ? `${ke.flats}♭` : '○'}</>}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── PROGRESIONES ── */}
          {activeTab === 'progresiones' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Progresiones en <span className="text-amber-400 font-bold">{entry.major} Mayor</span>
              </p>
              {PROGRESSIONS.map(prog => {
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
                    <span className={`text-xs font-black ${prog.color}`}>{prog.name}</span>
                    <p className="font-mono text-xs text-gray-300 mt-1 mb-1">{chords}</p>
                    <p className="text-[10px] text-gray-600">{prog.desc}</p>
                  </div>
                )
              })}

              <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-3">
                <p className="text-amber-300 font-bold text-xs mb-1">💡 Walking Bass — ii-V-I en {entry.major}</p>
                <p className="font-mono text-xs text-gray-300 mb-1">
                  {entry.notes[1]} m7 → {entry.notes[4]} 7 → {entry.notes[0]} Maj7
                </p>
                <p className="text-[10px] text-gray-500">
                  Desciende por el círculo. Bajo: raíz → 3ª → 5ª → 7ª + approach cromáticos.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
