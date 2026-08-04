import type { NoteName } from '../types'
import type { KeyMode } from './harmony'

// ─────────────────────────────────────────────────────────────────────────────
// Song persistence — two backends behind one interface:
//   • Electron: real .json files in a user-configurable folder (via IPC bridge
//     exposed by electron/preload.cjs as window.songsAPI).
//   • Browser (dev): localStorage, same pattern as the rest of src/data.
// ─────────────────────────────────────────────────────────────────────────────

export interface Song {
  id: string
  title: string
  author?: string
  key: { root: NoteName; mode: KeyMode }
  tempo: number | null   // BPM
  body: string           // raw ChordPro-ish text — single source of truth
  createdAt: number
  updatedAt: number
  version: 1
}

export interface SongMeta {
  id: string
  title: string
  key: Song['key']
  tempo: number | null
  updatedAt: number
}

export interface SongStorage {
  listSongs(): Promise<SongMeta[]>
  readSong(id: string): Promise<Song | null>
  writeSong(song: Song): Promise<void>
  deleteSong(id: string): Promise<void>
  getSongsFolder(): Promise<string | null>
  chooseSongsFolder(): Promise<string | null>
  readonly isFileBacked: boolean
}

// IPC bridge injected by electron/preload.cjs (absent in the browser / old exe)
declare global {
  interface Window {
    songsAPI?: {
      listSongs(): Promise<SongMeta[]>
      readSong(id: string): Promise<Song | null>
      writeSong(song: Song): Promise<{ ok: boolean; error?: string }>
      deleteSong(id: string): Promise<{ ok: boolean }>
      getSongsFolder(): Promise<string>
      chooseSongsFolder(): Promise<string | null>
    }
  }
}

export function newSong(): Song {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: 'Nueva canción',
    key: { root: 'C', mode: 'major' },
    tempo: 120,
    body: '',
    createdAt: now,
    updatedAt: now,
    version: 1,
  }
}

// ── Browser backend (localStorage) ──────────────────────────────────────────

const STORAGE_KEY = 'basstheory_songs_v1'

function loadAll(): Song[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Song[]
  } catch {
    return []
  }
}

function saveAll(songs: Song[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs))
}

const browserStorage: SongStorage = {
  isFileBacked: false,
  async listSongs() {
    return loadAll()
      .map(({ id, title, key, tempo, updatedAt }) => ({ id, title, key, tempo, updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },
  async readSong(id) {
    return loadAll().find(s => s.id === id) ?? null
  },
  async writeSong(song) {
    const songs = loadAll()
    const idx = songs.findIndex(s => s.id === song.id)
    if (idx >= 0) songs[idx] = song
    else songs.push(song)
    saveAll(songs)
  },
  async deleteSong(id) {
    saveAll(loadAll().filter(s => s.id !== id))
  },
  async getSongsFolder() { return null },
  async chooseSongsFolder() { return null },
}

// ── Electron backend (thin wrapper over window.songsAPI) ────────────────────

function makeElectronStorage(api: NonNullable<Window['songsAPI']>): SongStorage {
  return {
    isFileBacked: true,
    async listSongs() { return api.listSongs() },
    async readSong(id) { return api.readSong(id) },
    async writeSong(song) {
      const res = await api.writeSong(song)
      if (!res.ok) throw new Error(res.error ?? 'No se pudo guardar la canción')
    },
    async deleteSong(id) { await api.deleteSong(id) },
    async getSongsFolder() { return api.getSongsFolder() },
    async chooseSongsFolder() { return api.chooseSongsFolder() },
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

let instance: SongStorage | null = null

export function getSongStorage(): SongStorage {
  if (!instance) {
    // Require the actual bridge, not just the Electron UA — an old exe without
    // the new preload would otherwise crash. Fall back to localStorage.
    instance = window.songsAPI ? makeElectronStorage(window.songsAPI) : browserStorage
  }
  return instance
}
