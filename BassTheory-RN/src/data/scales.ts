import type { Scale, ScaleCategory } from '../types'

export const CHROMATIC_SCALE: Scale = {
  id: '__chromatic__',
  name: 'Chromatic (All Notes)',
  category: 'major',
  intervals: ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'],
  isCustom: false,
}

export const BUILT_IN_SCALES: Scale[] = [
  { id: 'major',           name: 'Major (Ionian)',        category: 'major',      intervals: ['1', '2', '3', '4', '5', '6', '7'] },
  { id: 'dorian',          name: 'Dorian',                category: 'modes',      intervals: ['1', '2', 'b3', '4', '5', '6', 'b7'] },
  { id: 'phrygian',        name: 'Phrygian',              category: 'modes',      intervals: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'] },
  { id: 'lydian',          name: 'Lydian',                category: 'modes',      intervals: ['1', '2', '3', '#4', '5', '6', '7'] },
  { id: 'mixolydian',      name: 'Mixolydian',            category: 'modes',      intervals: ['1', '2', '3', '4', '5', '6', 'b7'] },
  { id: 'aeolian',         name: 'Aeolian',               category: 'modes',      intervals: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
  { id: 'locrian',         name: 'Locrian',               category: 'modes',      intervals: ['1', 'b2', 'b3', '4', '#4', 'b6', 'b7'] },
  { id: 'natural-minor',   name: 'Natural Minor',         category: 'minor',      intervals: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
  { id: 'harmonic-minor',  name: 'Harmonic Minor',        category: 'minor',      intervals: ['1', '2', 'b3', '4', '5', 'b6', '7'] },
  { id: 'melodic-minor',   name: 'Melodic Minor',         category: 'minor',      intervals: ['1', '2', 'b3', '4', '5', '6', '7'] },
  { id: 'major-pentatonic',name: 'Major Pentatonic',      category: 'pentatonic', intervals: ['1', '2', '3', '5', '6'] },
  { id: 'minor-pentatonic',name: 'Minor Pentatonic',      category: 'pentatonic', intervals: ['1', 'b3', '4', '5', 'b7'] },
  { id: 'blues',           name: 'Blues Scale',           category: 'blues',      intervals: ['1', 'b3', '4', '#4', '5', 'b7'] },
  { id: 'major-triad',     name: 'Major Triad',           category: 'arpeggio',   intervals: ['1', '3', '5'] },
  { id: 'minor-triad',     name: 'Minor Triad',           category: 'arpeggio',   intervals: ['1', 'b3', '5'] },
  { id: 'maj7',            name: 'Major 7 (Maj7)',         category: 'arpeggio',   intervals: ['1', '3', '5', '7'] },
  { id: 'min7',            name: 'Minor 7 (Min7)',         category: 'arpeggio',   intervals: ['1', 'b3', '5', 'b7'] },
  { id: 'dom7',            name: 'Dominant 7 (Dom7)',      category: 'arpeggio',   intervals: ['1', '3', '5', 'b7'] },
  { id: 'dim7',            name: 'Diminished 7 (Dim7)',    category: 'arpeggio',   intervals: ['1', 'b3', '#4', '6'] },
  { id: 'half-dim',        name: 'Half-Diminished (m7b5)', category: 'arpeggio',   intervals: ['1', 'b3', '#4', 'b7'] },
]

export const CATEGORY_LABELS: Record<ScaleCategory, string> = {
  major:      'Mayor',
  minor:      'Menor',
  modes:      'Modos',
  pentatonic: 'Pentatónica',
  blues:      'Blues',
  arpeggio:   'Arpegios',
  custom:     'Mis Escalas',
}

export const CATEGORY_ORDER: ScaleCategory[] = [
  'major', 'minor', 'modes', 'pentatonic', 'blues', 'arpeggio', 'custom',
]

export function getAllScales(customScales: Scale[]): Scale[] {
  return [
    ...BUILT_IN_SCALES,
    ...customScales.map(s => ({ ...s, isCustom: true })),
  ]
}
