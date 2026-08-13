import { useState } from 'react'
import { useIsMobile, useIsPortrait } from '../hooks/useIsMobile'

const DISMISS_KEY = 'mt-landscape-hint-dismissed'

/**
 * Dismissible banner suggesting landscape orientation on phone-sized
 * portrait viewports. Never forces orientation — the user decides.
 */
export default function LandscapeSuggestion() {
  const isMobile   = useIsMobile()
  const isPortrait = useIsPortrait()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === 'true',
  )

  if (dismissed || !isMobile || !isPortrait) return null

  return (
    <div className="flex-shrink-0 bg-amber-900/30 border-b border-amber-700/40 px-3 py-1.5 flex items-center gap-2 text-xs text-amber-200">
      <span className="text-base leading-none">↻</span>
      <span className="flex-1">Se ve mejor en horizontal — girá tu celular para más espacio.</span>
      <button
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, 'true')
          setDismissed(true)
        }}
        className="text-amber-400 hover:text-amber-200 transition-colors px-1 font-bold leading-none"
        title="No mostrar de nuevo"
      >
        ✕
      </button>
    </div>
  )
}
