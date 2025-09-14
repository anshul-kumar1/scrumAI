# ScrumAI Meeting Assistant

> **AI-powered meeting productivity tool built with Electron**

ScrumAI transforms your meetings into actionable insights through real-time AI processing, automatic transcription, and intelligent content management.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-27.0.0-blue.svg)](https://electronjs.org/)

## Core Features

### Real-Time Meeting Processing

- **Live Audio Capture**: High-quality microphone input with Web Audio API
- **Real-Time Transcription**: Powered by OpenAI Whisper for accurate speech-to-text
- **Smart Keyword Extraction**: Automatically identifies and prioritizes important terms
- **Audio Visualization**: Dynamic audio level indicators and waveform display

### AI-Powered Insights

- **Sentiment Analysis**: Real-time mood and engagement tracking
- **Topic Classification**: Intelligent categorization of discussion topics
- **Action Item Detection**: Automatic identification of tasks and decisions
- **Meeting Summaries**: Comprehensive notes and strategy summaries

### Content Management

- **Editable Notes**: Full editing capabilities for meeting content
- **Export Integration**: Seamless export to Notion and GitHub
- **Live & Post-Meeting Modes**: Real-time tracking and comprehensive analysis
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Electron      │    │   Renderer      │    │   Python        │
│   Main Process  │◄──►│   Process       │◄──►│   AI Subprocess │
│                 │    │                 │    │                 │
│ • Window Mgmt   │    │ • UI Rendering  │    │ • Whisper STT   │
│ • IPC Bridge    │    │ • Audio Capture │    │ • NLP Processing│
│ • Python Spawn  │    │ • User Input    │    │ • Sentiment AI  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   External APIs │
│   Database      │    │ • Notion        │
│ • Auth          │    │ • GitHub        │
│ • Real-time     │    │ • Integrations  │
└─────────────────┘    └─────────────────┘
```

### Tech Stack

- **Frontend**: Electron 27.0.0, Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js (Electron main process)
- **AI/ML**: Python 3.10+, PyTorch, OpenAI Whisper, Transformers
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Audio**: Web Audio API, node-record-lpcm16, speaker
- **Build**: electron-builder for cross-platform distribution

## Quick Start

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **Python** 3.10+
- **Git** for version control

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/anshul-kumar1/scrumAI.git
   cd scrumAI
   ```

2. **Install dependencies**

   ```bash
   npm install
   npm run setup-python
   ```

3. **Configure environment variables**

   ```bash
   cp config.env.example config.env
   # Edit config.env with your API keys
   ```

4. **Start the application**
   ```bash
   npm start
   ```

### Development Mode

```bash
npm run dev  # Starts with DevTools open
```

## Configuration

### Environment Variables

Create a `config.env` file in the project root:

```bash
# Notion API Configuration
NOTION_API_KEY=your_notion_api_key_here
NOTION_PARENT_PAGE_ID=your_notion_parent_page_id_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# GitHub Configuration
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=your_github_username_or_org
GITHUB_REPO=your_repository_name
```

### API Setup

#### Notion Integration

1. Create a [Notion integration](https://www.notion.so/my-integrations)
2. Copy the API key to `NOTION_API_KEY`
3. Share a page with your integration and copy the page ID to `NOTION_PARENT_PAGE_ID`

#### Supabase Setup

1. Create a [Supabase project](https://supabase.com/dashboard)
2. Copy the project URL and anon key to your config

#### GitHub Integration

1. Create a [GitHub personal access token](https://github.com/settings/tokens)
2. Grant `repo` permissions
3. Add token and repository details to config

## Build & Distribution

### Development Build

```bash
npm run build
```

### Platform-Specific Builds

```bash
npm run build:win    # Windows (NSIS installer)
npm run build:mac    # macOS (DMG)
npm run build:linux  # Linux (AppImage)
```

## Usage

### Starting a Meeting

1. Click **"Start Meeting"** to begin audio capture
2. Speak naturally - the app processes audio in real-time
3. Watch keywords and transcript appear live
4. Click **"Stop Meeting"** when finished

### Post-Meeting Analysis

1. Review automatically generated meeting notes
2. Edit content as needed using the built-in editor
3. Export to Notion for documentation
4. Create GitHub issues for action items

### Keyboard Shortcuts

- `Space`: Toggle mute/unmute
- `Ctrl/Cmd + S`: Save current content
- `Ctrl/Cmd + E`: Export to external service
- `Escape`: Close modals/dialogs

## Testing

```bash
npm test        # Run test suite
npm run lint    # Code quality check
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Project Structure

```
scrumAI/
├── src/
│   ├── electron/           # Main Electron process
│   │   ├── main.js         # Application entry point
│   │   └── preload.js      # Security bridge
│   ├── renderer/           # Frontend application
│   │   ├── auth/           # Authentication system
│   │   ├── js/             # JavaScript modules
│   │   ├── styles/         # CSS styling
│   │   └── index.html      # Main UI
│   ├── python/             # AI processing layer
│   │   └── ai-env/         # Python virtual environment
│   └── assets/             # Static resources
├── cursor_rules/           # Development guidelines
├── config.env             # Environment configuration
└── package.json           # Dependencies and scripts
```

## Troubleshooting

### Common Issues

**Audio not working:**

- Check microphone permissions
- Ensure audio device is not being used by another application

**Python AI processing fails:**

- Verify Python 3.10+ installation
- Run `npm run setup-python` to reinstall dependencies

**Export features not working:**

- Verify API keys in `config.env`
- Check internet connection
- Ensure proper permissions for external services

**Application won't start:**

- Clear `node_modules` and run `npm install`
- Check Node.js version compatibility
- Verify all environment variables are set

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Qualcomm** for the hackathon opportunity
- **NYU** for hosting the event
- **OpenAI Whisper** for speech recognition capabilities
- **Supabase** for backend infrastructure
- **Notion** and **GitHub** for integration APIs

---

**Built by the ScrumAI Team for Qualcomm Hackathon NYU 2025**
