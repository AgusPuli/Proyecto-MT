import { useEffect, useState } from 'react'

/**
 * True when the viewport is phone-sized (covers both portrait and landscape
 * phone widths — landscape phones are typically 600-900px wide).
 * Used to adapt layout density (e.g. shrink the circle of fifths) for touch
 * screens without relying on user-agent sniffing.
 */
export function useIsMobile(breakpoint = 900): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint,
  )

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [breakpoint])

  return isMobile
}

/** True when the viewport is taller than it is wide (portrait orientation). */
export function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches,
  )

  useEffect(() => {
    const mql = window.matchMedia('(orientation: portrait)')
    const update = () => setIsPortrait(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  return isPortrait
}
