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
  
  // System information
  platform: process.platform,
  arch: process.arch,
  
  // Environment variables (securely exposed)
  getEnvVar: (key) => {
    // Only expose specific environment variables for security
    const allowedKeys = ['NOTION_API_KEY', 'NOTION_PARENT_PAGE_ID', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    if (allowedKeys.includes(key)) {
      return process.env[key];
    }
    return undefined;
  }
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
