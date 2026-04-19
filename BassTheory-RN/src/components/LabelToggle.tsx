import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import type { LabelMode } from '../types'

const MODES: { key: LabelMode; label: string }[] = [
  { key: 'note',     label: 'Nota' },
  { key: 'solfege',  label: 'Solfeo' },
  { key: 'interval', label: 'Interv.' },
  { key: 'degree',   label: 'Grado' },
  { key: 'finger',   label: 'Dedo' },
]

interface Props {
  value: LabelMode
  onChange: (mode: LabelMode) => void
}

export default function LabelToggle({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {MODES.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          onPress={() => onChange(key)}
          style={[styles.btn, value === key && styles.btnActive]}
          activeOpacity={0.7}
        >
          <Text style={[styles.text, value === key && styles.textActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  btnActive: {
    backgroundColor: '#0f766e',
  },
  text: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
  },
  textActive: {
    color: '#f0fdfa',
  },
})
