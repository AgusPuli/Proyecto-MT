import { useEffect } from 'react'
import { useIsMobile } from './useIsMobile'

/**
 * On phone-sized viewports, requests fullscreen on tap whenever the app
 * isn't already fullscreen. Browsers require a user gesture to enter
 * fullscreen, so we listen persistently (not once) — a swipe gesture from
 * the OS can kick the browser out of fullscreen, and the next tap should
 * be able to re-enter it rather than being stuck without a way back in.
 */
export function useAutoFullscreen() {
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!isMobile) return

    function enterFullscreen() {
      if (document.fullscreenElement) return
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void
      }
      const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el)
      request?.()?.catch?.(() => { /* ignored — user can still use the app normally */ })
    }

    document.addEventListener('touchstart', enterFullscreen, { passive: true })
    document.addEventListener('click', enterFullscreen)

    return () => {
      document.removeEventListener('touchstart', enterFullscreen)
      document.removeEventListener('click', enterFullscreen)
    }
  }, [isMobile])
}
