/**
 * Electron Preload Script
 * 
 * This script runs in the renderer process context but has access to Node.js APIs.
 * Responsibilities:
 * - Secure bridge between main and renderer processes
 * - Expose safe IPC methods to the renderer
 * - Maintain security by not exposing full Node.js APIs to renderer
 * - Context isolation security implementation
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose protected methods that allow the renderer process to use
 * the ipcRenderer without exposing the entire object
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Meeting management
  startMeeting: (meetingData) => ipcRenderer.invoke('start-meeting', meetingData),
  stopMeeting: () => ipcRenderer.invoke('stop-meeting'),
  
  // Audio processing
  processAudio: (audioData) => ipcRenderer.invoke('process-audio', audioData),
  
  // AI results listener
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
});

/**
 * DOM Content Loaded Event
 * Initialize any preload-specific functionality
 */
window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script loaded - secure bridge established');
  
  // Set platform-specific styles
  document.body.classList.add(`platform-${process.platform}`);
  document.body.classList.add(`arch-${process.arch}`);
});
