Implement the local AI processing pipeline for meeting insights:

**MODELS TO INTEGRATE:**
1. **Speech-to-Text**: Whisper or similar local model
2. **Sentiment Analysis**: Local transformer model
3. **Speaker Diarization**: Identify individual speakers
4. **Topic Modeling**: Extract key themes and subjects
5. **Engagement Analysis**: Measure participation patterns

**PYTHON ENVIRONMENT SETUP:**
```bash
python3.10 -m venv ai-env
source ai-env/bin/activate  # Windows: ai-env\Scripts\activate
pip install torch whisper transformers nltk pandas numpy
```

**PROCESSING PIPELINE:**
- Audio chunks → Speech recognition → Text analysis
- Real-time sentiment scoring per speaker
- Generate insights every 30 seconds
- Store results in SQLite with timestamps

**INSIGHT CATEGORIES:**
- **Engagement**: Speaking time, interruption patterns
- **Sentiment**: Emotional tone throughout meeting
- **Participation**: Active vs passive contributors
- **Topics**: Key themes and discussion points
- **Action Items**: Decisions and follow-ups identified

**PERFORMANCE OPTIMIZATION:**
- Use audio chunking to prevent memory issues
- Implement model caching for faster inference
- Background processing to maintain UI responsiveness
- Efficient data serialization between Node.js and Python