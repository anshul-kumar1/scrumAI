# Whisper AI Integration for ScrumAI

This integration adds real-time speech transcription to the ScrumAI application using OpenAI's Whisper model.

## Features

- **Real-time Speech Transcription**: Converts speech to text in real-time during meetings
- **Live Display**: Transcripts appear instantly in the "Transcript" tab
- **Automatic Saving**: When a meeting ends, transcripts are automatically saved as `meetingnotes_[timestamp].txt` to your home directory
- **Keyword Extraction**: Automatically extracts keywords from the transcript for the Keywords tab
- **Cross-platform**: Works on Windows, macOS, and Linux

## Setup Instructions

### 1. Install Python Dependencies

Run the setup script to create a Python virtual environment and install dependencies:

```bash
setup_whisper.bat
```

This will:
- Create a Python virtual environment (`whisper_env`)
- Install required packages (numpy, sounddevice, onnxruntime, PyYAML)
- Set up the Whisper models

### 2. Verify Installation

The application will automatically detect if the required files are present:
- Python executable in `whisper_env` or system PATH
- Whisper model files in `whisper/models/`
- Configuration file at `whisper/config.yaml`

### 3. Run the Application

Start the ScrumAI application as usual:

```bash
npm start
```

## How to Use

1. **Start Meeting**: Click the "Start Meeting" button
   - This will initialize the Whisper transcription service
   - A microphone permission dialog may appear - grant permission
   - You'll see status messages in the console

2. **Begin Speaking**: Start talking normally
   - Real-time transcripts will appear in the "Transcript" tab
   - Keywords will be automatically extracted and shown in the "Keywords" tab
   - Timestamps are added to each transcript entry

3. **Stop Meeting**: Click the "Stop Meeting" button
   - This stops the transcription
   - Automatically saves the full transcript as `meetingnotes_[timestamp].txt` in your home directory
   - Shows a confirmation dialog with the saved file location

## File Structure

```
scrumAI/
├── whisper/
│   ├── transcriber_for_nodejs.py    # Main transcription script
│   ├── standalone_model.py          # Whisper model wrapper
│   ├── standalone_whisper.py        # Whisper implementation
│   ├── config.yaml                  # Configuration
│   ├── mel_filters.npz              # Mel filter coefficients
│   ├── requirements_minimal.txt     # Python dependencies
│   └── models/
│       ├── WhisperEncoder.onnx      # Encoder model
│       └── WhisperDecoder.onnx      # Decoder model
├── src/
│   ├── services/
│   │   └── whisperService.js        # Node.js Whisper service wrapper
│   └── electron/
│       ├── main.js                  # Updated with Whisper integration
│       └── preload.js               # Updated with IPC methods
├── whisper_env/                     # Python virtual environment
└── setup_whisper.bat               # Setup script
```

## Configuration

The Whisper service can be configured by editing `whisper/config.yaml`:

```yaml
# Audio settings
sample_rate: 16000          # Audio sample rate in Hz
chunk_duration: 4           # Duration of each audio chunk in seconds
channels: 1                 # Number of audio channels (1 for mono)

# Processing settings
max_workers: 4              # Number of parallel transcription workers
silence_threshold: 0.001    # Threshold for silence detection
queue_timeout: 1.0          # Timeout for audio queue operations

# Model paths
encoder_path: "whisper/models/WhisperEncoder.onnx"
decoder_path: "whisper/models/WhisperDecoder.onnx"
```

## Troubleshooting

### Common Issues

1. **"Python not found"**
   - Ensure Python 3.8+ is installed
   - Run `setup_whisper.bat` to create virtual environment

2. **"Model files not found"**
   - Ensure the Whisper ONNX models are in `whisper/models/`
   - Check that `WhisperEncoder.onnx` and `WhisperDecoder.onnx` exist

3. **"Microphone access denied"**
   - Grant microphone permissions to the application
   - Check your operating system's privacy settings

4. **No transcript appearing**
   - Check the console for error messages
   - Ensure you're speaking loud enough (above silence threshold)
   - Verify the microphone is working in other applications

### Performance Tips

- For better performance on lower-end hardware, reduce `max_workers` in config.yaml
- Increase `silence_threshold` if picking up too much background noise
- Decrease `chunk_duration` for more responsive transcription (but higher CPU usage)

## Technical Details

The integration works by:

1. **Electron Main Process** spawns a Python child process running the Whisper transcriber
2. **Python Process** captures audio from the microphone and processes it through the Whisper model
3. **IPC Communication** sends transcript data back to the Electron app via JSON over stdout
4. **Renderer Process** receives transcript events and updates the UI in real-time
5. **File I/O** saves the complete transcript when the meeting ends

The system is designed to be resilient and will gracefully handle errors like microphone access issues or model loading problems.