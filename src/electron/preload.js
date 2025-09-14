/**
 * Electron Preload Script
 * 
 * This script runs in the renderer process context but has access to Node.js APIs.
 */

const { ipcRenderer, contextBridge } = require('electron');

/**
 * Expose electronAPI to renderer process through context bridge
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Meeting management
  startMeeting: (meetingData) => ipcRenderer.invoke('start-meeting', meetingData),
  stopMeeting: () => ipcRenderer.invoke('stop-meeting'),

  // Transcript management
  saveTranscript: (filename) => ipcRenderer.invoke('save-transcript', filename),
  getFullTranscript: () => ipcRenderer.invoke('get-full-transcript'),

  // Event listeners for Whisper events
  onWhisperTranscript: (callback) => ipcRenderer.on('whisper-transcript', callback),
  onWhisperError: (callback) => ipcRenderer.on('whisper-error', callback),
  onWhisperStatus: (callback) => ipcRenderer.on('whisper-status', callback),

  // Remove event listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // System information
  platform: process.platform,
  arch: process.arch
});

// Debug: Log that electronAPI is available
console.log('Preload script loaded - electronAPI exposed to window');

/**
 * DOM Content Loaded Event
 * Initialize any preload-specific functionality
 */
window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script DOM loaded - electronAPI ready');
  
  // Set platform-specific styles
  document.body.classList.add(`platform-${process.platform}`);
  document.body.classList.add(`arch-${process.arch}`);
});
