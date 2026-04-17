import type { Scale } from '../types'

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------
// Swap LocalStorageScaleRepository for an ApiScaleRepository and nothing else
// in the app needs to change. The singleton export below is the only coupling
// point.
// ---------------------------------------------------------------------------

export interface ScaleRepository {
  getCustomScales(): Scale[]
  saveCustomScale(scale: Scale): void
  deleteCustomScale(id: string): void
}

// ---------------------------------------------------------------------------
// LocalStorage implementation
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'basstheory_custom_scales_v1'

class LocalStorageScaleRepository implements ScaleRepository {
  getCustomScales(): Scale[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      return JSON.parse(raw) as Scale[]
    } catch {
      // Corrupt data — start fresh rather than crashing
      return []
    }
  }

  saveCustomScale(scale: Scale): void {
    const scales = this.getCustomScales()
    const idx = scales.findIndex(s => s.id === scale.id)
    if (idx >= 0) {
      scales[idx] = scale
    } else {
      scales.push(scale)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scales))
  }

  deleteCustomScale(id: string): void {
    const scales = this.getCustomScales().filter(s => s.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scales))
  }
}

// ---------------------------------------------------------------------------
// Singleton — import this everywhere, swap the class above for API variant
// ---------------------------------------------------------------------------

export const scaleRepository: ScaleRepository = new LocalStorageScaleRepository()
