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
      nodeIntegration: true, // Enable for Supabase access
      contextIsolation: false, // Disable for module access
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
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(__dirname, '../python/ai_processor.py');
    
    console.log('Starting Python AI processor:', pythonScriptPath);
    
    // Use Python from virtual environment
    const pythonPath = path.join(__dirname, '../python/ai-env/bin/python');
    
    pythonProcess = spawn(pythonPath, [pythonScriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let initResponseReceived = false;

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log('Python AI Output:', output);
      
      try {
        const result = JSON.parse(output);
        
        if (!initResponseReceived) {
          // This is the initialization response
          initResponseReceived = true;
          if (result.success) {
            resolve(result);
          } else {
            reject(new Error(result.error || 'AI initialization failed'));
          }
        } else {
          // This is an AI processing result
          if (mainWindow) {
            mainWindow.webContents.send('ai-result', result);
          }
        }
      } catch (e) {
        console.log('Non-JSON output from Python AI:', output);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python AI Error:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python AI process exited with code ${code}`);
      pythonProcess = null;
      if (!initResponseReceived) {
        reject(new Error(`Python process exited with code ${code}`));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python AI process:', error);
      if (!initResponseReceived) {
        reject(error);
      }
    });
  });
}

/**
 * IPC Event Handlers
 */

// Handle AI initialization
ipcMain.handle('initialize-ai', async (event) => {
  try {
    console.log('Initializing AI processor...');
    const result = await initializePythonAI();
    return result;
  } catch (error) {
    console.error('AI initialization failed:', error);
    return { success: false, error: error.message };
  }
});

// Handle audio data from renderer for AI processing
ipcMain.handle('process-audio', async (event, audioData) => {
  try {
    if (pythonProcess && pythonProcess.stdin.writable) {
      const message = {
        type: 'audio_chunk',
        audio_data: audioData
      };
      pythonProcess.stdin.write(JSON.stringify(message) + '\n');
      return { success: true };
    } else {
      throw new Error('Python AI process not available');
    }
  } catch (error) {
    console.error('Failed to process audio:', error);
    return { success: false, error: error.message };
  }
});

// Handle meeting start/stop events
ipcMain.handle('start-meeting', async (event, meetingData) => {
  console.log('Starting meeting:', meetingData);
  
  // Initialize AI if not already running
  if (!pythonProcess) {
    try {
      await initializePythonAI();
    } catch (error) {
      console.error('Failed to start AI for meeting:', error);
      return { success: false, error: 'AI initialization failed' };
    }
  }
  
  return { success: true, meetingId: Date.now() };
});

ipcMain.handle('stop-meeting', async (event) => {
  console.log('Stopping meeting');
  // Keep Python AI process alive for future meetings
  // Only kill it when the app closes
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
