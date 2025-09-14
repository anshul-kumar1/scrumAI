/**
 * Electron Preload Script
 * 
 * This script runs in the renderer process context but has access to Node.js APIs.
 * Since contextIsolation is disabled, we expose electronAPI directly to window.
 */

const { ipcRenderer } = require('electron');

/**
 * Expose electronAPI directly to window since contextIsolation is false
 */
window.electronAPI = {
  // Meeting management
  startMeeting: (meetingData) => ipcRenderer.invoke('start-meeting', meetingData),
  stopMeeting: () => ipcRenderer.invoke('stop-meeting'),
  
  // AI processing
  initializeAI: () => ipcRenderer.invoke('initialize-ai'),
  processAudio: (audioData) => ipcRenderer.invoke('process-audio', audioData),
  
  // AI results listener
  onAIResult: (callback) => ipcRenderer.on('ai-result', (event, ...args) => callback(...args)),
  removeAIResultListener: (callback) => ipcRenderer.removeListener('ai-result', callback),
  
  // Legacy AI results (for backwards compatibility)
  onAIResults: (callback) => ipcRenderer.on('ai-results', callback),
  removeAIResultsListener: (callback) => ipcRenderer.removeListener('ai-results', callback),
  
  // Database operations
  saveInsight: (insight) => ipcRenderer.invoke('save-insight', insight),
  getMeetingHistory: () => ipcRenderer.invoke('get-meeting-history'),
  
  // Real-time updates
  onRealtimeUpdate: (callback) => ipcRenderer.on('realtime-update', callback),
  removeRealtimeListener: (callback) => ipcRenderer.removeListener('realtime-update', callback),
  
  // System information
  platform: process.platform,
  arch: process.arch
};

// Debug: Log that electronAPI is available
console.log('Preload script loaded - electronAPI exposed to window');
console.log('Available electronAPI methods:', Object.keys(window.electronAPI));

/**
 * DOM Content Loaded Event
 * Initialize any preload-specific functionality
 */
window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script DOM loaded - electronAPI ready');
  
  // Set platform-specific styles
  document.body.classList.add(`platform-${process.platform}`);
  document.body.classList.add(`arch-${process.arch}`);
  
  // Verify electronAPI is accessible
  if (window.electronAPI) {
    console.log('✅ electronAPI is available in renderer');
  } else {
    console.error('❌ electronAPI is NOT available in renderer');
  }
});
