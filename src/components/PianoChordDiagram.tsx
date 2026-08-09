import { CHROMATIC_NOTES } from '../data/notes'

interface Props {
  /** Semitonos desde el Do más grave dibujado. */
  positions: number[]
  /** Cuál de esos semitonos es la fundamental del acorde. */
  rootPosition: number
  /** Octavas dibujadas (por defecto, las necesarias para que entre el acorde). */
  octaves?: number
  keyW?: number
}

const WHITE_PC   = [0, 2, 4, 5, 7, 9, 11]      // C D E F G A B
const BLACK_GAP: Record<number, number> = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 }

const ROOT_C  = '#3b82f6'
const CHORD_C = '#14b8a6'

/**
 * Mini teclado que marca las notas de un acorde. Mismo lenguaje visual que el
 * teclado grande: la tecla conserva su color y la nota tocada se marca con un
 * punto sólido al pie.
 */
export default function PianoChordDiagram({
  positions,
  rootPosition,
  octaves,
  keyW = 17,
}: Props) {
  const need = Math.max(...positions, 11)
  const oct  = octaves ?? Math.max(2, Math.floor(need / 12) + 1)

  const gap  = 1
  const step = keyW + gap
  const h    = Math.round(keyW * 4.2)
  const bw   = Math.round(keyW * 0.62)
  const bh   = Math.round(h * 0.62)
  const whiteCount = oct * 7
  const width = whiteCount * step - gap

  const set = new Set(positions)

  const dot = (pos: number, size: number) => {
    const isRoot = pos === rootPosition
    return (
      <div style={{
        width: size, height: size, borderRadius: 999,
        background: isRoot ? ROOT_C : CHORD_C,
        boxShadow: isRoot
          ? '0 0 0 2px rgba(255,255,255,0.85), 0 0 8px rgba(59,130,246,0.7)'
          : '0 1px 3px rgba(0,0,0,0.5)',
      }} />
    )
  }

  return (
    <div style={{ position: 'relative', width, height: h }} className="select-none">
      {/* Teclas blancas */}
      {Array.from({ length: whiteCount }, (_, i) => {
        const pos    = Math.floor(i / 7) * 12 + WHITE_PC[i % 7]
        const active = set.has(pos)
        return (
          <div key={`w${i}`} style={{
            position: 'absolute', left: i * step, top: 0,
            width: keyW, height: h, zIndex: 1,
            background: 'linear-gradient(175deg, #ffffff 0%, #f2f4f8 60%, #dde2e9 100%)',
            border: '1px solid #a8afba', borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.07)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 5, overflow: 'hidden',
          }}>
            {active && dot(pos, Math.round(keyW * 0.62))}
          </div>
        )
      })}

      {/* Teclas negras */}
      {Array.from({ length: oct }, (_, o) =>
        Object.entries(BLACK_GAP).map(([pcStr, g]) => {
          const pc     = Number(pcStr)
          const pos    = o * 12 + pc
          const active = set.has(pos)
          return (
            <div key={`b${pos}`} style={{
              position: 'absolute',
              left: (o * 7 + g) * step - bw / 2, top: 0,
              width: bw, height: bh, zIndex: 3,
              background: 'linear-gradient(175deg, #43434b 0%, #232329 55%, #0d0d11 100%)',
              border: '1px solid #000', borderTop: 'none',
              borderRadius: '0 0 3px 3px',
              boxShadow: '1px 4px 8px rgba(0,0,0,0.75)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: 4,
            }}>
              {active && dot(pos, Math.round(bw * 0.72))}
            </div>
          )
        })
      )}
    </div>
  )
}

/** Nombre de nota para un semitono absoluto del diagrama. */
export const posNote = (pos: number) => CHROMATIC_NOTES[((pos % 12) + 12) % 12]
