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
const fs = require('fs');
const https = require('https');

// Load environment variables
function loadEnvironmentVariables() {
  const envPath = path.join(__dirname, '../../config.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key.trim()] = value.trim();
        }
      }
    });
    
    console.log('Environment variables loaded successfully');
  } else {
    console.warn('config.env file not found. Please create it with your API keys.');
  }
}

// Load environment variables before creating the window
loadEnvironmentVariables();

// Keep a global reference of the window object
let mainWindow;

// GitHub Integration Configuration - loaded from environment variables
function getGitHubConfig() {
  return {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER || 'anshul-kumar1',
    repo: process.env.GITHUB_REPO || 'scrumAI'
  };
}

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

// Handle meeting start/stop events
ipcMain.handle('start-meeting', async (event, meetingData) => {
  console.log('Starting meeting:', meetingData);
  return { success: true, meetingId: Date.now() };
});

ipcMain.handle('stop-meeting', async (event) => {
  console.log('Stopping meeting');
  return { success: true };
});

// GitHub issue creation handler
ipcMain.handle('create-github-issue', async (event, issueData) => {
  console.log('Creating GitHub issue:', issueData);
  
  try {
    const result = await createGitHubIssue(issueData.title, issueData.body);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to create GitHub issue:', error);
    return { success: false, error: error.message };
  }
});

/**
 * GitHub API Integration
 */
function createGitHubIssue(title, body) {
  return new Promise((resolve, reject) => {
    const githubConfig = getGitHubConfig();
    
    // Validate GitHub configuration
    if (!githubConfig.token) {
      reject(new Error('GitHub token not found in environment variables. Please set GITHUB_TOKEN in config.env'));
      return;
    }
    
    const data = JSON.stringify({
      title: title,
      body: body
    });

    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/repos/${githubConfig.owner}/${githubConfig.repo}/issues`,
      method: 'POST',
      headers: {
        'Authorization': `token ${githubConfig.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'User-Agent': 'ScrumAI-Meeting-Assistant'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          
          if (res.statusCode === 201) {
            console.log('GitHub issue created successfully:', parsedData.html_url);
            resolve({
              issueNumber: parsedData.number,
              issueUrl: parsedData.html_url,
              title: parsedData.title
            });
          } else {
            console.error('GitHub API error:', res.statusCode, parsedData);
            console.error('Request URL was:', `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues`);
            console.error('Request headers were:', options.headers);
            reject(new Error(`GitHub API error: ${res.statusCode} - ${parsedData.message || 'Unknown error'}`));
          }
        } catch (parseError) {
          console.error('Failed to parse GitHub API response:', parseError);
          reject(new Error('Failed to parse GitHub API response'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('GitHub API request error:', error);
      reject(new Error(`GitHub API request failed: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

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
