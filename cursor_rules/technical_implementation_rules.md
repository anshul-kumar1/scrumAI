Implement the dual-runtime architecture for the audio meeting application:

**ELECTRON + SUPABASE SETUP:**
- Create main.js with Supabase client initialization
- Implement real-time subscriptions for live meeting updates
- Set up secure environment variables for Supabase credentials
- Configure Row Level Security (RLS) policies for data protection

**NODE.JS RESPONSIBILITIES:**
- Audio capture using navigator.mediaDevices.getUserMedia()
- Supabase database operations (CRUD for meetings, participants)
- Real-time UI updates via Supabase realtime subscriptions
- Python subprocess management and communication
- IPC channels between main and renderer processes

**PYTHON AI SUBPROCESS:**
- Dedicated Python process for AI model inference
- Input: Audio chunks from Node.js via stdin/stdout
- Output: Transcription, sentiment, insights back to Node.js
- Models: Whisper (speech-to-text), local sentiment analysis

**SUPABASE DATABASE SCHEMA:**
```sql
-- meetings table: id, title, created_at, status, host_id
-- participants table: id, meeting_id, name, joined_at, audio_enabled
-- insights table: id, meeting_id, participant_id, timestamp, insight_type, data, confidence
-- transcripts table: id, meeting_id, speaker_id, timestamp, text, sentiment_score
```

**INTER-PROCESS COMMUNICATION:**
- Node.js ↔ Python: JSON over stdin/stdout or named pipes
- Main ↔ Renderer: Electron IPC for UI updates
- Client ↔ Supabase: Real-time subscriptions for live data

**REQUIREMENTS:**
- Robust error handling for Python subprocess failures
- Efficient audio buffer management
- Memory optimization for long meetings
- Connection handling for Supabase real-time features