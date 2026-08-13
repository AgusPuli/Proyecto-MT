import { useEffect } from 'react'
import { useIsMobile } from './useIsMobile'

/**
 * On phone-sized viewports, requests fullscreen on the first tap.
 * Browsers require a user gesture to enter fullscreen, so we can't do it
 * on load — we arm a one-time listener instead. This hides the browser's
 * URL bar and, on most Android browsers, the system navigation bar too.
 */
export function useAutoFullscreen() {
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!isMobile) return
    if (document.fullscreenElement) return

    function enterFullscreen() {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void
      }
      const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el)
      request?.()?.catch?.(() => { /* ignored — user can still use the app normally */ })
    }

    document.addEventListener('touchstart', enterFullscreen, { once: true, passive: true })
    document.addEventListener('click', enterFullscreen, { once: true })

    return () => {
      document.removeEventListener('touchstart', enterFullscreen)
      document.removeEventListener('click', enterFullscreen)
    }
  }, [isMobile])
}
