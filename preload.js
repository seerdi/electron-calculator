const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  getLanInfo: () => ipcRenderer.invoke('get-lan-info'),
  platform: process.platform
});
