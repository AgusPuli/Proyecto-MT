const { contextBridge, ipcRenderer } = require('electron')

// Bridge for the Songs feature — the renderer never touches fs directly.
contextBridge.exposeInMainWorld('songsAPI', {
  listSongs:         ()     => ipcRenderer.invoke('songs:list'),
  readSong:          (id)   => ipcRenderer.invoke('songs:read', id),
  writeSong:         (song) => ipcRenderer.invoke('songs:write', song),
  deleteSong:        (id)   => ipcRenderer.invoke('songs:delete', id),
  getSongsFolder:    ()     => ipcRenderer.invoke('songs:getFolder'),
  chooseSongsFolder: ()     => ipcRenderer.invoke('songs:chooseFolder'),
})
