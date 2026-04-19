import React, { useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { STANDARD_TUNING, getNoteAtFret, NOTE_TO_SOLFEGE } from '../data/notes'
import type { FretNote, LabelMode, NoteName } from '../types'

const TOTAL_FRETS = 24
const CELL_H = 52
const MARKER_H = 28
const STRING_LABELS = ['G', 'D', 'A', 'E']
const STRING_THICKNESS = [1, 2, 3, 4]
const STRING_COLORS = ['#b0b8c8', '#9099a8', '#707888', '#505868']
const MARKER_FRETS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24])
const DOUBLE_MARKERS = new Set([12, 24])
const DOT_SIZE = 34
const LABEL_COL_W = 36

function getFretWidth(fret: number): number {
  if (fret === 0) return 46
  return Math.max(22, Math.round(70 * Math.pow(2, -(fret - 1) / 12)))
}

const fretWidths: number[] = [
  getFretWidth(0),
  ...Array.from({ length: TOTAL_FRETS }, (_, i) => getFretWidth(i + 1)),
]

function getLabel(note: FretNote, mode: LabelMode): string {
  switch (mode) {
    case 'note':     return note.note
    case 'solfege':  return NOTE_TO_SOLFEGE[note.note]
    case 'interval': return note.interval
    case 'degree':   return note.degree
    case 'finger':   return String(note.finger)
  }
}

interface Props {
  notes: FretNote[]
  labelMode: LabelMode
  onFretClick: (string: number, fret: number, note: NoteName) => void
}

export default function Fretboard({ notes, labelMode, onFretClick }: Props) {
  const noteMap = useMemo(() => {
    const map = new Map<string, FretNote>()
    notes.forEach(n => map.set(`${n.string}-${n.fret}`, n))
    return map
  }, [notes])

  const fretCols = useMemo(
    () => [0, ...Array.from({ length: TOTAL_FRETS }, (_, i) => i + 1)],
    [],
  )

  function openNoteForString(s: number): NoteName {
    // string 0 = G = tuning[3], string 3 = E = tuning[0]
    return STANDARD_TUNING[3 - s]
  }

  return (
    <View style={styles.wrapper}>
      {/* Fixed string label column */}
      <View style={styles.labelCol}>
        {([0, 1, 2, 3] as const).map(s => (
          <View key={s} style={styles.labelCell}>
            <Text style={styles.labelText}>{STRING_LABELS[s]}</Text>
          </View>
        ))}
        <View style={{ height: MARKER_H }} />
      </View>

      {/* Scrollable fret area */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        <View>
          {/* String rows */}
          {([0, 1, 2, 3] as const).map(s => (
            <View key={s} style={styles.stringRow}>
              {fretCols.map(fret => {
                const w = fretWidths[fret]
                const noteData = noteMap.get(`${s}-${fret}`)
                const dotSize = Math.min(DOT_SIZE, w - 2)
                const label = noteData ? getLabel(noteData, labelMode) : ''
                const fontSize = label.length <= 2 ? 11 : label.length === 3 ? 9 : 8

                return (
                  <TouchableOpacity
                    key={fret}
                    onPress={() => onFretClick(s, fret, getNoteAtFret(openNoteForString(s), fret))}
                    style={[
                      styles.fretCell,
                      {
                        width: w,
                        borderRightWidth: fret === 0 ? 4 : 1,
                        borderRightColor: fret === 0 ? '#d1d5db' : '#4b5563',
                      },
                    ]}
                    activeOpacity={0.6}
                  >
                    {/* String line */}
                    <View
                      style={[
                        styles.stringLine,
                        {
                          height: STRING_THICKNESS[s],
                          backgroundColor: STRING_COLORS[s],
                          top: (CELL_H - STRING_THICKNESS[s]) / 2,
                        },
                      ]}
                    />
                    {/* Note dot */}
                    {noteData && (
                      <View
                        style={[
                          styles.noteDot,
                          { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
                          noteData.isRoot ? styles.noteDotRoot : styles.noteDotScale,
                        ]}
                      >
                        <Text
                          style={[
                            styles.noteLabel,
                            { fontSize },
                            noteData.isRoot ? styles.noteLabelRoot : styles.noteLabelScale,
                          ]}
                        >
                          {label}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}

          {/* Markers + fret numbers row */}
          <View style={styles.markersRow}>
            {fretCols.map(fret => (
              <View key={fret} style={[styles.markerCell, { width: fretWidths[fret] }]}>
                {MARKER_FRETS.has(fret) && (
                  <View style={styles.markerDots}>
                    <View style={styles.dot} />
                    {DOUBLE_MARKERS.has(fret) && (
                      <View style={[styles.dot, { marginLeft: 3 }]} />
                    )}
                  </View>
                )}
                {fret > 0 && <Text style={styles.fretNum}>{fret}</Text>}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    backgroundColor: '#030712',
  },
  labelCol: {
    width: LABEL_COL_W,
    backgroundColor: '#111827',
    borderRightWidth: 1,
    borderRightColor: '#374151',
    zIndex: 10,
  },
  labelCell: {
    height: CELL_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scroll: {
    flex: 1,
  },
  stringRow: {
    flexDirection: 'row',
    height: CELL_H,
  },
  fretCell: {
    height: CELL_H,
    backgroundColor: '#451a03',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stringLine: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  noteDot: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  noteDotRoot: {
    backgroundColor: '#fbbf24',
  },
  noteDotScale: {
    backgroundColor: '#14b8a6',
  },
  noteLabel: {
    fontWeight: 'bold',
  },
  noteLabelRoot: {
    color: '#451a03',
  },
  noteLabelScale: {
    color: '#111827',
  },
  markersRow: {
    flexDirection: 'row',
    height: MARKER_H,
    backgroundColor: '#111827',
  },
  markerCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  markerDots: {
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6b7280',
  },
  fretNum: {
    color: '#4b5563',
    fontSize: 9,
    marginTop: 2,
  },
})
