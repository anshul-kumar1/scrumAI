"""Application configuration settings."""
import os
from pathlib import Path

# Directories
PROJECT_ROOT = Path(__file__).parent.parent
TEMP_DIR = PROJECT_ROOT / "temp"

# Ensure temp directory exists
TEMP_DIR.mkdir(exist_ok=True)

# Audio settings
SAMPLE_RATE = 16000
AUDIO_CHUNK_SIZE = 1024
BUFFER_DURATION_SECONDS = 5

# WebSocket settings
MAX_CONNECTIONS_PER_ROOM = 10
HEARTBEAT_INTERVAL = 30
