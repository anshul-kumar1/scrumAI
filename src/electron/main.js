/**
 * Electron Main Process
 * 
 * This is the main entry point for the Electron application.
 * Responsibilities:
 * - Application lifecycle management (start, quit, window management)
 * - IPC communication between main and renderer processes
 * - Native OS integration and window creation
 * - Coordination with Python AI subprocess
 * - Security and permission management
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Keep a global reference of the window object
let mainWindow;
let pythonProcess;

/**
 * Create the main application window
 */
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Security best practice
      contextIsolation: true, // Security best practice
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    show: false
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize Python AI subprocess
 */
function initializePythonAI() {
  const pythonScriptPath = path.join(__dirname, '../python/ai_processor.py');
  
  pythonProcess = spawn('python', [pythonScriptPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log('Python AI Output:', data.toString());
    // Forward AI results to renderer process
    if (mainWindow) {
      mainWindow.webContents.send('ai-results', data.toString());
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error('Python AI Error:', data.toString());
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python AI process exited with code ${code}`);
  });
}

/**
 * IPC Event Handlers
 */

// Handle audio data from renderer for AI processing
ipcMain.handle('process-audio', async (event, audioData) => {
  if (pythonProcess) {
    pythonProcess.stdin.write(JSON.stringify(audioData) + '\n');
  }
});

// Handle meeting start/stop events
ipcMain.handle('start-meeting', async (event, meetingData) => {
  console.log('Starting meeting:', meetingData);
  initializePythonAI();
  return { success: true, meetingId: Date.now() };
});

ipcMain.handle('stop-meeting', async (event) => {
  console.log('Stopping meeting');
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
  return { success: true };
});

/**
 * App Event Handlers
 */

// App ready event
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Clean up Python process
  if (pythonProcess) {
    pythonProcess.kill();
  }
  
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});
