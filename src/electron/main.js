/**
 * Electron Main Process
 * 
 * This is the main entry point for the Electron application.
 * Responsibilities:
 * - Application lifecycle management (start, quit, window management)
 * - IPC communication between main and renderer processes
 * - Native OS integration and window creation
 * - Security and permission management
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const WhisperService = require('../services/whisperService');
const ChatbotService = require('../services/chatbotService');

// Keep a global reference of the window object
let mainWindow;

// Service instances
let whisperService;
let chatbotService;

/**
 * Create the main application window
 */
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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
 * IPC Event Handlers
 */

// Initialize Whisper service
function initializeWhisperService() {
  whisperService = new WhisperService();

  // Set up transcript callback to send to renderer
  whisperService.onTranscript((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('whisper-transcript', data);
    }

    // Update chatbot with latest transcript file if available
    if (chatbotService && data.transcriptFile) {
      chatbotService.setLiveTranscriptFile(data.transcriptFile);
    }
  });

  // Set up error callback
  whisperService.onError((error) => {
    console.error('Whisper error:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('whisper-error', error);
    }
  });

  // Set up status callback
  whisperService.onStatus((status) => {
    console.log('Whisper status:', status.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('whisper-status', status);
    }
  });
}

// Handle meeting start/stop events
ipcMain.handle('start-meeting', async (event, meetingData) => {
  console.log('Starting meeting:', meetingData);

  try {
    if (!whisperService) {
      initializeWhisperService();
    }

    await whisperService.start();
    console.log('Whisper transcription started');

    // Initialize and start chatbot service automatically
    if (!chatbotService) {
      console.log('Initializing chatbot service');
      chatbotService = new ChatbotService();

      // Set up chatbot event handlers
      chatbotService.setOnResponseCallback((response, isStreaming) => {
        if (mainWindow) {
          mainWindow.webContents.send('chatbot-response', { response, isStreaming });
        }
      });

      chatbotService.setOnErrorCallback((error) => {
        if (mainWindow) {
          mainWindow.webContents.send('chatbot-error', error.message);
        }
      });

      chatbotService.setOnStatusCallback((status) => {
        if (mainWindow) {
          mainWindow.webContents.send('chatbot-status', status);
        }
      });
    }

    // Start chatbot service
    try {
      await chatbotService.start();
      console.log('Chatbot service started');
    } catch (chatbotError) {
      console.error('Failed to start chatbot service:', chatbotError);
      // Don't fail the entire meeting start if chatbot fails
    }

    return { success: true, meetingId: Date.now() };
  } catch (error) {
    console.error('Failed to start Whisper transcription:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-meeting', async (event) => {
  console.log('Stopping meeting');

  try {
    if (whisperService && whisperService.isServiceRunning()) {
      await whisperService.stop();
      console.log('Whisper transcription stopped');
    }

    // Stop chatbot service
    if (chatbotService) {
      try {
        await chatbotService.stop();
        console.log('Chatbot service stopped');
      } catch (chatbotError) {
        console.error('Failed to stop chatbot service:', chatbotError);
        // Don't fail the entire meeting stop if chatbot fails
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to stop Whisper transcription:', error);
    return { success: false, error: error.message };
  }
});

// Chatbot Service IPC Handlers
ipcMain.handle('initialize-chatbot', async (event) => {
  console.log('Initializing chatbot service');

  try {
    if (!chatbotService) {
      chatbotService = new ChatbotService();

      // Set up chatbot event handlers
      chatbotService.setOnResponseCallback((response, isStreaming) => {
        if (mainWindow) {
          mainWindow.webContents.send('chatbot-response', { response, isStreaming });
        }
      });

      chatbotService.setOnErrorCallback((error) => {
        if (mainWindow) {
          mainWindow.webContents.send('chatbot-error', error.message);
        }
      });

      chatbotService.setOnStatusCallback((status) => {
        if (mainWindow) {
          mainWindow.webContents.send('chatbot-status', status);
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to initialize chatbot service:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-chatbot', async (event) => {
  console.log('Starting chatbot service');

  try {
    if (!chatbotService) {
      return { success: false, error: 'Chatbot service not initialized' };
    }

    await chatbotService.start();
    console.log('Chatbot service started');

    return { success: true };
  } catch (error) {
    console.error('Failed to start chatbot service:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-chatbot', async (event) => {
  console.log('Stopping chatbot service');

  try {
    if (chatbotService) {
      await chatbotService.stop();
      console.log('Chatbot service stopped');
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to stop chatbot service:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-chat-message', async (event, message) => {
  console.log('Sending chat message:', message);

  try {
    if (!chatbotService) {
      return { success: false, error: 'Chatbot service not initialized' };
    }

    const response = await chatbotService.sendMessage(message);
    return { success: true, data: response };
  } catch (error) {
    console.error('Failed to send chat message:', error);
    return { success: false, error: error.message };
  }
});

// Handle transcript export
ipcMain.handle('save-transcript', async (event, filename) => {
  console.log('Saving transcript:', filename);

  try {
    if (!whisperService) {
      throw new Error('No transcript available - meeting not started');
    }

    const filepath = await whisperService.saveTranscript(filename);
    return { success: true, filepath };
  } catch (error) {
    console.error('Failed to save transcript:', error);
    return { success: false, error: error.message };
  }
});

// Handle get full transcript
ipcMain.handle('get-full-transcript', async (event) => {
  try {
    if (!whisperService) {
      return { success: false, error: 'No transcript available - meeting not started' };
    }

    const transcript = whisperService.getFullTranscript();
    return { success: true, transcript };
  } catch (error) {
    console.error('Failed to get transcript:', error);
    return { success: false, error: error.message };
  }
});

/**
 * App Event Handlers
 */

// Disable hardware acceleration to prevent GPU process crashes on Windows
app.disableHardwareAcceleration();

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
app.on('window-all-closed', async () => {
  // Clean up Whisper service
  if (whisperService && whisperService.isServiceRunning()) {
    try {
      await whisperService.stop();
    } catch (error) {
      console.error('Error stopping Whisper service on app quit:', error);
    }
  }

  // Clean up Chatbot service
  if (chatbotService) {
    try {
      await chatbotService.stop();
    } catch (error) {
      console.error('Error stopping Chatbot service on app quit:', error);
    }
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
