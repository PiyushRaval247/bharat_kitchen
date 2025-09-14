const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Navigation methods
  onNavigate: (callback) => ipcRenderer.on('navigate-to', callback),
  
  // Data export methods
  onExportData: (callback) => ipcRenderer.on('export-data', callback),
  
  // System info
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  
  // Notification methods
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  
  // Print methods
  printReceipt: (data) => ipcRenderer.invoke('print-receipt', data),
  printLabel: (product, copies, labelConfig) => ipcRenderer.invoke('print-label', product, copies, labelConfig),
  printLabelsBatch: (products, labelConfig) => ipcRenderer.invoke('print-labels-batch', products, labelConfig),
  printCustomLabel: (leftLabel, rightLabel, customConfig, commonSettings) => ipcRenderer.invoke('print-custom-label', leftLabel, rightLabel, customConfig, commonSettings),
  
  // File system methods (secure)
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveFile: (filename, data) => ipcRenderer.invoke('save-file', filename, data),
  
  // Cleanup
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});