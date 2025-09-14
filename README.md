# ScrumAI - Intelligent Meeting Assistant

**AI-powered meeting productivity platform with real-time transcription and intelligent chat assistance**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-27.0.0-blue.svg)](https://electronjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://python.org/)

**Built for Qualcomm Hackathon NYU 2025**

## Overview

ScrumAI transforms meeting productivity by combining real-time speech recognition with conversational AI assistance. The platform integrates OpenAI Whisper for precise transcription with AnythingLLM for contextual chat interactions, creating a comprehensive meeting intelligence solution.

## Core Features

### Real-Time Meeting Intelligence
- **Live Audio Transcription**: OpenAI Whisper integration for industry-leading accuracy
- **Instant Keyword Extraction**: AI-powered identification of key discussion points
- **Audio Visualization**: Dynamic waveform display and level indicators
- **Meeting Timer**: Automatic session tracking and duration monitoring

### AI Chat Integration (NEW)
- **AnythingLLM Assistant**: Conversational AI with meeting context awareness
- **RAG-Powered Queries**: Ask complex questions about your meeting content
- **Live Context Access**: Chat assistant has real-time access to transcript data
- **Intelligent Query Routing**: Automatic detection of complex vs simple queries
- **Streaming Responses**: Real-time AI response generation
- **Document Indexing**: Automatic transcript upload for enhanced retrieval

### Export Capabilities
- **Notion Integration**: Direct export of meeting notes and summaries
- **GitHub Integration**: Automatic issue creation from action items
- **Local Storage**: Timestamped transcript files
- **Multi-Format Output**: Text, JSON, and structured data exports

## Architecture

```
User Interface (Electron Renderer)
    ↓
Main Process (Node.js + IPC)
    ↓
AI Processing Layer (Python)
    ├── Whisper Engine (Real-time STT)
    ├── AnythingLLM (RAG System + Chat API)
    └── Meeting Analysis (NLP Processing)
    ↓
Data Storage (Local Files + External APIs)
```

### Technology Stack

**Frontend**: Electron 27.0.0, Vanilla JavaScript, Web Audio API  
**AI/ML**: OpenAI Whisper (ONNX), AnythingLLM, PyTorch, Transformers  
**Backend**: Node.js, Python 3.10+, IPC Communication  

## Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- Python 3.10+ with pip
- Git for version control
- Microphone for audio capture

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

# GitHub Configuration
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=your_github_username_or_org
GITHUB_REPO=your_repository_name
```

### AnythingLLM Setup

Configure AnythingLLM integration in `whisper/anythingLLM/config.yaml`:

```yaml
# AnythingLLM Configuration
api_key: "your_anythingllm_api_key"
model_server_base_url: "http://localhost:3001/api"
workspace_slug: "your_workspace_name"
stream: true
stream_timeout: 30
```

### API Setup

**Notion Integration**
1. Create a [Notion integration](https://www.notion.so/my-integrations)
2. Copy the API key to `NOTION_API_KEY`
3. Share a page with your integration and copy the page ID

**GitHub Integration**
1. Create a [GitHub personal access token](https://github.com/settings/tokens)
2. Grant `repo` permissions for issue creation

**AnythingLLM Setup**
1. Install and run [AnythingLLM](https://anythingllm.com/)
2. Create a workspace and obtain API key
3. Update the config file with your local AnythingLLM instance details

## Usage Guide

### Starting a Meeting

1. Launch ScrumAI and grant microphone permissions
2. Click the "Start Meeting" button
3. Begin speaking - real-time transcription starts immediately
4. Monitor live transcript, keywords, and audio visualization
5. Use the Chat tab to ask questions about the meeting

### Using the AI Chat Assistant

**Simple Queries** (Live Context)
- "What did we just discuss about the authentication system?"
- "Who is taking lead on the API development?"
- "What was the last action item mentioned?"

**Complex Analysis** (RAG-Powered)
- "Summarize the key decisions made in this meeting"
- "What are the main technical challenges identified?"
- "Create a list of all action items with assigned owners"
- "Analyze the sentiment of the discussion about the Q2 release"

The system automatically determines whether to use live context or RAG based on query complexity.

### Post-Meeting Workflow

1. Review content using transcript and keywords tabs
2. Ask the chat assistant for summaries and insights
3. Edit and refine transcript or AI-generated content
4. Export to Notion for documentation or GitHub for issue tracking
5. Automatic local backup with timestamp

## Build & Distribution

```bash
npm run build         # Development build
npm run build:win     # Windows (NSIS installer)
npm run build:mac     # macOS (DMG)
npm run build:linux   # Linux (AppImage)
```

## Project Structure

```
scrumAI/
├── src/
│   ├── electron/              # Main Electron process
│   ├── renderer/              # Frontend application
│   │   ├── js/                # JavaScript modules
│   │   │   ├── chat-controller.js  # AnythingLLM chat interface
│   │   │   └── audio-manager.js    # Web Audio API integration
│   │   └── index.html         # Main UI structure
│   └── services/              # Backend services
│       ├── whisperService.js  # Whisper transcription service
│       └── chatbotService.js  # AnythingLLM chatbot service
├── whisper/                   # AI processing layer
│   ├── anythingLLM/          # AnythingLLM integration
│   │   ├── chatbot_client.py  # Python AnythingLLM client
│   │   └── config.yaml        # LLM configuration
│   ├── meeting_transcriber.py # Enhanced transcriber with LLM
│   └── models/               # ONNX model files
└── config.env               # Environment configuration
```

## Troubleshooting

**Audio not working:**
- Verify microphone permissions in system settings
- Ensure no other applications are using the microphone

**Python AI processing fails:**
- Confirm Python 3.10+ installation: `python --version`
- Reinstall dependencies: `npm run setup-python`

**AnythingLLM chat not responding:**
- Verify AnythingLLM service is running on localhost:3001
- Check API key configuration in `whisper/anythingLLM/config.yaml`
- Ensure workspace exists and is accessible

**Export features not working:**
- Validate API keys in `config.env`
- Test internet connectivity
- Verify service permissions (Notion, GitHub)

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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Qualcomm** for the hackathon opportunity
- **NYU** for hosting the event
- **OpenAI Whisper** for speech recognition capabilities
- **AnythingLLM** for conversational AI platform
- **Notion** and **GitHub** for integration APIs

---

**Built by the ScrumAI Team for Qualcomm Hackathon NYU 2025**
