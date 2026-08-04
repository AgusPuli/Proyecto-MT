const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

// ─────────────────────────────────────────────────────────────────────────────
// Songs storage — .json files in a user-configurable folder.
// The chosen folder persists in userData/songs-config.json.
// Default: Documents/Pulis Bass Theory/Canciones (Program Files is read-only).
// ─────────────────────────────────────────────────────────────────────────────

const configPath = () => path.join(app.getPath('userData'), 'songs-config.json')

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf-8'))
  } catch {
    return {}
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath(), JSON.stringify(config, null, 2))
  } catch (e) {
    console.error('No se pudo guardar la config de canciones:', e)
  }
}

/** Resolves (and creates if needed) the songs folder. */
function resolveSongsFolder() {
  const config = loadConfig()
  const folder = config.songsFolder
    || path.join(app.getPath('documents'), 'Pulis Bass Theory', 'Canciones')
  fs.mkdirSync(folder, { recursive: true })
  return folder
}

// IPC security: never build paths from raw renderer strings.
const SAFE_ID = /^[a-z0-9-]+$/i

function slugify(title) {
  const s = String(title || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return s || 'cancion'
}

function songFileFor(folder, id) {
  const files = fs.readdirSync(folder).filter(f => f.endsWith(`-${id}.json`))
  return files.length ? path.join(folder, files[0]) : null
}

function registerSongsIpc() {
  ipcMain.handle('songs:list', () => {
    try {
      const folder = resolveSongsFolder()
      const metas = []
      for (const f of fs.readdirSync(folder)) {
        if (!f.endsWith('.json')) continue
        try {
          const song = JSON.parse(fs.readFileSync(path.join(folder, f), 'utf-8'))
          if (song && song.id && song.title !== undefined) {
            metas.push({
              id: song.id,
              title: song.title,
              key: song.key,
              tempo: song.tempo ?? null,
              updatedAt: song.updatedAt ?? 0,
            })
          }
        } catch { /* skip corrupt file */ }
      }
      return metas.sort((a, b) => b.updatedAt - a.updatedAt)
    } catch {
      return []
    }
  })

  ipcMain.handle('songs:read', (_e, id) => {
    try {
      if (!SAFE_ID.test(String(id))) return null
      const folder = resolveSongsFolder()
      const file = songFileFor(folder, id)
      if (!file) return null
      return JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch {
      return null
    }
  })

  ipcMain.handle('songs:write', (_e, song) => {
    try {
      if (!song || typeof song.id !== 'string' || !SAFE_ID.test(song.id)) {
        return { ok: false, error: 'Canción inválida' }
      }
      const folder = resolveSongsFolder()
      const target = path.join(folder, `${slugify(song.title)}-${song.id}.json`)
      // Title changed → old slug file must go (same id, different name)
      const existing = songFileFor(folder, song.id)
      if (existing && existing !== target) fs.unlinkSync(existing)
      fs.writeFileSync(target, JSON.stringify(song, null, 2), 'utf-8')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) }
    }
  })

  ipcMain.handle('songs:delete', (_e, id) => {
    try {
      if (!SAFE_ID.test(String(id))) return { ok: false }
      const folder = resolveSongsFolder()
      const file = songFileFor(folder, id)
      if (file) fs.unlinkSync(file)
      return { ok: true }
    } catch {
      return { ok: false }
    }
  })

  ipcMain.handle('songs:getFolder', () => resolveSongsFolder())

  ipcMain.handle('songs:chooseFolder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = await dialog.showOpenDialog(win, {
      title: 'Elegir carpeta de canciones',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (res.canceled || !res.filePaths.length) return null
    const folder = res.filePaths[0]
    saveConfig({ ...loadConfig(), songsFolder: folder })
    return folder
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '../public/icon.ico'),
    title: "Puli's Bass Theory",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  win.loadFile(path.join(__dirname, '../dist/index.html'))
  win.setMenuBarVisibility(false)
}

app.whenReady().then(() => {
  registerSongsIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
