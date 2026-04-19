import React from 'react'
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { CHROMATIC_NOTES } from '../data/notes'
import type { NoteName } from '../types'

interface Props {
  value: NoteName
  onChange: (note: NoteName) => void
}

export default function RootSelector({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {CHROMATIC_NOTES.map(note => (
        <TouchableOpacity
          key={note}
          onPress={() => onChange(note)}
          style={[styles.btn, value === note && styles.btnActive]}
          activeOpacity={0.7}
        >
          <Text style={[styles.text, value === note && styles.textActive]}>
            {note}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flexShrink: 0,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  content: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  btn: {
    width: 42,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
  },
  btnActive: {
    backgroundColor: '#92400e',
  },
  text: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  textActive: {
    color: '#fbbf24',
  },
})
