import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../data/scales'
import { ALL_INTERVALS } from '../data/notes'
import type { Scale, ScaleCategory, IntervalName } from '../types'

interface Props {
  visible: boolean
  scales: Scale[]
  activeScaleId: string
  onSelect: (scale: Scale) => void
  onDelete: (id: string) => void
  onSave: (scale: Scale) => void
  onClose: () => void
}

export default function ScaleLibraryModal({
  visible,
  scales,
  activeScaleId,
  onSelect,
  onDelete,
  onSave,
  onClose,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<ScaleCategory>('major')
  const [building, setBuilding] = useState(false)
  const [selectedIntervals, setSelectedIntervals] = useState<IntervalName[]>(['1'])
  const [scaleName, setScaleName] = useState('')

  const filteredScales = scales.filter(s => s.category === selectedCategory)

  function toggleInterval(iv: IntervalName) {
    if (iv === '1') return
    setSelectedIntervals(prev =>
      prev.includes(iv) ? prev.filter(i => i !== iv) : [...prev, iv],
    )
  }

  function handleSave() {
    if (!scaleName.trim()) {
      Alert.alert('Error', 'Ingresá un nombre para la escala')
      return
    }
    if (selectedIntervals.length < 3) {
      Alert.alert('Error', 'Seleccioná al menos 3 intervalos (incluyendo la raíz)')
      return
    }
    const sorted = ALL_INTERVALS.filter(iv => selectedIntervals.includes(iv)) as IntervalName[]
    onSave({
      id: `custom-${Date.now()}`,
      name: scaleName.trim(),
      category: 'custom',
      intervals: sorted,
      isCustom: true,
    })
    setScaleName('')
    setSelectedIntervals(['1'])
    setBuilding(false)
  }

  function cancelBuild() {
    setBuilding(false)
    setScaleName('')
    setSelectedIntervals(['1'])
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{building ? 'Nueva Escala' : 'Escalas'}</Text>
          <View style={styles.headerActions}>
            {!building && (
              <TouchableOpacity onPress={() => setBuilding(true)} style={styles.newBtn}>
                <Text style={styles.newBtnText}>+ Nueva</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={building ? cancelBuild : onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>{building ? 'Cancelar' : '✕'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {building ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={styles.builderScroll}
              contentContainerStyle={styles.builderContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                style={styles.nameInput}
                placeholder="Nombre de la escala..."
                placeholderTextColor="#6b7280"
                value={scaleName}
                onChangeText={setScaleName}
                autoFocus
              />

              <Text style={styles.sectionLabel}>Intervalos</Text>
              <View style={styles.intervalGrid}>
                {ALL_INTERVALS.map(iv => (
                  <TouchableOpacity
                    key={iv}
                    onPress={() => toggleInterval(iv)}
                    style={[
                      styles.intervalBtn,
                      selectedIntervals.includes(iv) && styles.intervalBtnActive,
                      iv === '1' && styles.intervalBtnRoot,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.intervalBtnText,
                        selectedIntervals.includes(iv) && styles.intervalBtnTextActive,
                      ]}
                    >
                      {iv}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.preview}>
                {ALL_INTERVALS.filter(iv => selectedIntervals.includes(iv)).join('  ')}
              </Text>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Guardar Escala</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <>
            {/* Category tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabs}
              contentContainerStyle={styles.tabsContent}
            >
              {CATEGORY_ORDER.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[styles.tab, selectedCategory === cat && styles.tabActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, selectedCategory === cat && styles.tabTextActive]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Scale list */}
            <ScrollView style={styles.scaleList}>
              {filteredScales.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {selectedCategory === 'custom'
                      ? 'No tenés escalas personalizadas todavía.\nTocá "+ Nueva" para crear una.'
                      : 'No hay escalas en esta categoría.'}
                  </Text>
                </View>
              ) : (
                filteredScales.map(scale => (
                  <View key={scale.id} style={styles.scaleRow}>
                    <TouchableOpacity
                      style={[
                        styles.scaleItem,
                        activeScaleId === scale.id && styles.scaleItemActive,
                      ]}
                      onPress={() => onSelect(scale)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.scaleName,
                          activeScaleId === scale.id && styles.scaleNameActive,
                        ]}
                      >
                        {scale.name}
                      </Text>
                      <Text style={styles.scaleIntervals}>
                        {scale.intervals.join('  ')}
                      </Text>
                    </TouchableOpacity>
                    {scale.isCustom && (
                      <TouchableOpacity
                        onPress={() =>
                          Alert.alert('Eliminar', `¿Eliminar "${scale.name}"?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Eliminar',
                              style: 'destructive',
                              onPress: () => onDelete(scale.id),
                            },
                          ])
                        }
                        style={styles.deleteBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  title: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  newBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0f766e',
  },
  newBtnText: {
    color: '#f0fdfa',
    fontSize: 13,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  // Category tabs
  tabs: {
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1f2937',
  },
  tabActive: {
    backgroundColor: '#0f766e',
  },
  tabText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#f0fdfa',
  },
  // Scale list
  scaleList: {
    flex: 1,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  scaleItem: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  scaleItemActive: {
    backgroundColor: '#0f766e22',
  },
  scaleName: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  scaleNameActive: {
    color: '#2dd4bf',
  },
  scaleIntervals: {
    color: '#6b7280',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  deleteBtnText: {
    color: '#6b7280',
    fontSize: 14,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Builder
  builderScroll: {
    flex: 1,
  },
  builderContent: {
    padding: 16,
    gap: 16,
  },
  nameInput: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionLabel: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  intervalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intervalBtn: {
    width: 52,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  intervalBtnActive: {
    backgroundColor: '#0f766e',
    borderColor: '#14b8a6',
  },
  intervalBtnRoot: {
    backgroundColor: '#92400e',
    borderColor: '#d97706',
  },
  intervalBtnText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
  },
  intervalBtnTextActive: {
    color: '#f0fdfa',
  },
  preview: {
    color: '#fbbf24',
    fontSize: 13,
    fontFamily: 'monospace',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
  },
  saveBtn: {
    backgroundColor: '#0f766e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#f0fdfa',
    fontSize: 15,
    fontWeight: '700',
  },
})
