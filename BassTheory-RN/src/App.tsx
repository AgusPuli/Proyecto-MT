import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { StatusBar as ExpoStatusBar } from 'expo-status-bar'

import Fretboard from './components/Fretboard'
import RootSelector from './components/RootSelector'
import LabelToggle from './components/LabelToggle'
import ScaleLibraryModal from './components/ScaleLibraryModal'

import { computeFretboard } from './data/notes'
import { getAllScales, BUILT_IN_SCALES, CHROMATIC_SCALE } from './data/scales'
import { BUILT_IN_FINGERINGS, DEFAULT_FINGERING } from './data/fingerings'
import { getCustomScales, saveCustomScale, deleteCustomScale } from './data/storage'

import type { ChordFilter, LabelMode, NoteName, Scale } from './types'

const DEFAULT_ROOT: NoteName = 'A'
const DEFAULT_SCALE: Scale = BUILT_IN_SCALES.find(s => s.id === 'minor-pentatonic')!
const TOTAL_FRETS = 24

const CHORD_FILTERS: { key: ChordFilter; label: string }[] = [
  { key: 'all',      label: 'Todas' },
  { key: 'triads',   label: 'Tríadas' },
  { key: 'sevenths', label: '7°' },
]

export default function App() {
  const [root, setRoot]               = useState<NoteName>(DEFAULT_ROOT)
  const [selectedScale, setScale]     = useState<Scale>(DEFAULT_SCALE)
  const [labelMode, setLabelMode]     = useState<LabelMode>('note')
  const [customScales, setCustomScales] = useState<Scale[]>([])
  const [chordFilter, setChordFilter] = useState<ChordFilter>('all')
  const [showAllNotes, setShowAllNotes] = useState(false)
  const [scaleModalVisible, setScaleModalVisible] = useState(false)

  // Load custom scales from AsyncStorage on mount
  useEffect(() => {
    getCustomScales().then(setCustomScales)
  }, [])

  const activeScale = showAllNotes ? CHROMATIC_SCALE : selectedScale
  const activeFingeringPreset = DEFAULT_FINGERING

  const fretboardNotes = useMemo(
    () => computeFretboard(root, activeScale, TOTAL_FRETS, chordFilter, activeFingeringPreset),
    [root, activeScale, chordFilter, activeFingeringPreset],
  )

  const allScales = useMemo(() => getAllScales(customScales), [customScales])

  const handleFretClick = useCallback((_s: number, _f: number, note: NoteName) => {
    setRoot(note)
  }, [])

  async function handleSaveScale(scale: Scale) {
    await saveCustomScale(scale)
    const updated = await getCustomScales()
    setCustomScales(updated)
    setScale(scale)
    setScaleModalVisible(false)
  }

  async function handleDeleteScale(id: string) {
    await deleteCustomScale(id)
    const updated = await getCustomScales()
    setCustomScales(updated)
    if (selectedScale.id === id) setScale(DEFAULT_SCALE)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" />

      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          Bass<Text style={styles.logoAccent}>Theory</Text>
        </Text>
        <View style={styles.headerRight}>
          <Text style={styles.noteCount}>
            {fretboardNotes.length} notas
          </Text>
        </View>
      </View>

      {/* ── Root selector ───────────────────────────────────── */}
      <RootSelector value={root} onChange={setRoot} />

      {/* ── Label mode toggle ───────────────────────────────── */}
      <LabelToggle value={labelMode} onChange={setLabelMode} />

      {/* ── Chord filter + Show All ─────────────────────────── */}
      <View style={styles.controlRow}>
        {CHORD_FILTERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setChordFilter(key)}
            style={[styles.filterBtn, chordFilter === key && styles.filterBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterBtnText, chordFilter === key && styles.filterBtnTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.filterDivider} />
        <TouchableOpacity
          onPress={() => setShowAllNotes(v => !v)}
          style={[styles.filterBtn, styles.filterBtnWide, showAllNotes && styles.filterBtnTeal]}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterBtnText, showAllNotes && styles.filterBtnTextActive]}>
            {showAllNotes ? 'Ver Escala' : 'Ver Todo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Fretboard ───────────────────────────────────────── */}
      <View style={styles.fretboardContainer}>
        <Fretboard
          notes={fretboardNotes}
          labelMode={labelMode}
          onFretClick={handleFretClick}
        />
        <Text style={styles.fretHint}>← Deslizá el diapasón · Tocá un traste para cambiar la raíz</Text>
      </View>

      {/* ── Footer: scale info + open modal ─────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerTop}
          onPress={() => setScaleModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.footerScaleName}>
            {root} {selectedScale.name}
          </Text>
          <Text style={styles.footerChangeHint}>cambiar ▲</Text>
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.intervalRow}
        >
          {selectedScale.intervals.map(iv => (
            <View
              key={iv}
              style={[styles.intervalBadge, iv === '1' && styles.intervalBadgeRoot]}
            >
              <Text style={[styles.intervalText, iv === '1' && styles.intervalTextRoot]}>
                {iv}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ── Scale library modal ─────────────────────────────── */}
      <ScaleLibraryModal
        visible={scaleModalVisible}
        scales={allScales}
        activeScaleId={selectedScale.id}
        onSelect={scale => {
          setScale(scale)
          setScaleModalVisible(false)
        }}
        onDelete={handleDeleteScale}
        onSave={handleSaveScale}
        onClose={() => setScaleModalVisible(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#030712',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  logo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fbbf24',
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: '#2dd4bf',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noteCount: {
    color: '#6b7280',
    fontSize: 12,
  },
  // Control row
  controlRow: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    alignItems: 'center',
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  filterBtnWide: {
    flex: 1.4,
  },
  filterBtnActive: {
    backgroundColor: '#92400e',
  },
  filterBtnTeal: {
    backgroundColor: '#0f766e',
  },
  filterBtnText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: '#fef3c7',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#374151',
    marginHorizontal: 2,
  },
  // Fretboard
  fretboardContainer: {
    backgroundColor: '#030712',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  fretHint: {
    color: '#374151',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  // Footer
  footer: {
    flex: 1,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    minHeight: 80,
  },
  footerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  footerScaleName: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
  },
  footerChangeHint: {
    color: '#6b7280',
    fontSize: 12,
  },
  intervalRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
    alignItems: 'center',
  },
  intervalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  intervalBadgeRoot: {
    backgroundColor: '#451a03',
    borderColor: '#92400e',
  },
  intervalText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  intervalTextRoot: {
    color: '#fbbf24',
  },
})
