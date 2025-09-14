#!/usr/bin/env python3
"""
AI Processor for ScrumAI
Handles Whisper speech-to-text and DeepSeek analysis via Ollama
"""

import asyncio
import json
import sys
import logging
import tempfile
import os
from typing import Dict, List, Optional, Any
import requests
import subprocess
import base64
import wave
import io

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIProcessor:
    def __init__(self):
        self.ollama_url = "http://localhost:11434"
        self.deepseek_model = "deepseek-r1:latest"
        self.whisper_model = "base"  # Can be: tiny, base, small, medium, large
        self.is_ready = False
        
    async def initialize(self):
        """Initialize the AI processor"""
        try:
            # Check if Ollama is running
            await self.check_ollama_connection()
            
            # Check if Whisper is available
            await self.check_whisper_availability()
            
            self.is_ready = True
            logger.info("AI Processor initialized successfully")
            return {"success": True, "message": "AI Processor ready"}
            
        except Exception as e:
            logger.error(f"Failed to initialize AI Processor: {e}")
            return {"success": False, "error": str(e)}
    
    async def check_ollama_connection(self):
        """Check if Ollama is running and DeepSeek model is available"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                deepseek_available = any(self.deepseek_model in model.get("name", "") for model in models)
                
                if not deepseek_available:
                    raise Exception(f"DeepSeek model '{self.deepseek_model}' not found. Available models: {[m.get('name') for m in models]}")
                
                logger.info(f"Ollama connection successful. DeepSeek model available.")
                return True
            else:
                raise Exception(f"Ollama responded with status {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            raise Exception(f"Cannot connect to Ollama at {self.ollama_url}. Is it running? Error: {e}")
    
    async def check_whisper_availability(self):
        """Check if Whisper is available"""
        try:
            import whisper
            # Test loading a small model
            model = whisper.load_model("tiny")
            logger.info("Whisper is available")
            return True
        except ImportError:
            raise Exception("Whisper not installed. Run: pip install openai-whisper")
        except Exception as e:
            raise Exception(f"Whisper initialization failed: {e}")
    
    async def process_audio_chunk(self, audio_data: str) -> Dict[str, Any]:
        """Process audio chunk through Whisper -> DeepSeek pipeline"""
        if not self.is_ready:
            return {"success": False, "error": "AI Processor not initialized"}
        
        try:
            logger.info(f"📥 Received audio chunk for processing (base64 length: {len(audio_data)})")
            
            # Decode base64 audio data
            audio_bytes = base64.b64decode(audio_data)
            audio_size_kb = len(audio_bytes) / 1024
            
            logger.info(f"🔊 Decoded audio: {audio_size_kb:.1f} KB")
            
            # Save to temporary WAV file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_audio_path = temp_file.name
                
            logger.info(f"💾 Saved audio to temporary file: {temp_audio_path}")
            
            try:
                # Step 1: Transcribe with Whisper
                transcription = await self.transcribe_audio(temp_audio_path)
                
                if not transcription.strip():
                    return {
                        "success": True,
                        "transcription": "",
                        "analysis": {"message": "No speech detected"}
                    }
                
                # Step 2: Analyze with DeepSeek (with fallback)
                try:
                    analysis = await self.analyze_with_deepseek(transcription)
                except Exception as e:
                    logger.warning(f"DeepSeek analysis failed, using fallback: {e}")
                    # Fallback analysis if DeepSeek fails
                    analysis = {
                        "sentiment": "neutral",
                        "sentiment_score": 0.5,
                        "key_topics": ["general discussion"],
                        "action_items": [],
                        "speakers_detected": 1,
                        "urgency_level": "medium",
                        "summary": transcription[:100] + "..." if len(transcription) > 100 else transcription,
                        "keywords": transcription.split()[:5]  # First 5 words as keywords
                    }
                
                result = {
                    "success": True,
                    "transcription": transcription,
                    "analysis": analysis,
                    "timestamp": asyncio.get_event_loop().time()
                }
                
                logger.info(f"🎉 COMPLETE RESULT READY TO SEND:")
                logger.info(f"   Transcription: '{transcription}'")
                logger.info(f"   Analysis summary: '{analysis.get('summary', 'No summary')}'")
                logger.info(f"   Sending result back to main process...")
                
                return result
                
            finally:
                # Clean up temporary file
                os.unlink(temp_audio_path)
                
        except Exception as e:
            logger.error(f"Audio processing failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def transcribe_audio(self, audio_path: str) -> str:
        """Transcribe audio using Whisper"""
        try:
            import whisper
            
            # Load Whisper model (cached after first load)
            if not hasattr(self, '_whisper_model'):
                logger.info(f"Loading Whisper model: {self.whisper_model}")
                self._whisper_model = whisper.load_model(self.whisper_model)
            
            logger.info(f"🎤 Starting Whisper transcription for audio file: {audio_path}")
            
            # Transcribe audio with detailed options
            result = self._whisper_model.transcribe(
                audio_path,
                verbose=True,  # Enable verbose output
                language=None,  # Auto-detect language
                task="transcribe"  # Transcribe (not translate)
            )
            
            transcription = result["text"].strip()
            language = result.get("language", "unknown")
            
            # Log detailed Whisper results
            logger.info(f"🎯 WHISPER RESULTS:")
            logger.info(f"   Language detected: {language}")
            logger.info(f"   Full transcription: '{transcription}'")
            logger.info(f"   Transcription length: {len(transcription)} characters")
            
            # Log segments if available
            if "segments" in result:
                logger.info(f"   Number of segments: {len(result['segments'])}")
                for i, segment in enumerate(result["segments"][:3]):  # Log first 3 segments
                    start_time = segment.get("start", 0)
                    end_time = segment.get("end", 0)
                    text = segment.get("text", "").strip()
                    logger.info(f"   Segment {i+1}: [{start_time:.1f}s - {end_time:.1f}s] '{text}'")
            
            if not transcription:
                logger.warning("⚠️  Whisper returned empty transcription")
            else:
                logger.info(f"✅ Whisper transcription successful: {len(transcription)} chars")
            
            return transcription
            
        except Exception as e:
            logger.error(f"❌ Whisper transcription failed: {e}")
            raise
    
    async def analyze_with_deepseek(self, text: str) -> Dict[str, Any]:
        """Analyze transcribed text with DeepSeek via Ollama"""
        try:
            logger.info(f"🧠 Starting DeepSeek analysis for text: '{text[:100]}{'...' if len(text) > 100 else ''}'")
            
            prompt = f"""
Analyze this meeting transcription and provide insights in JSON format:

Text: "{text}"

Please provide a JSON response with these fields:
{{
    "sentiment": "positive|negative|neutral",
    "sentiment_score": 0.0-1.0,
    "key_topics": ["topic1", "topic2", "topic3"],
    "action_items": ["action1", "action2"],
    "speakers_detected": 1,
    "urgency_level": "low|medium|high",
    "summary": "brief summary",
    "keywords": ["keyword1", "keyword2", "keyword3"]
}}

Only return valid JSON, no other text.
"""

            logger.info(f"🚀 Sending request to DeepSeek model: {self.deepseek_model}")

            payload = {
                "model": self.deepseek_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.9
                }
            }
            
            logger.info(f"📡 Making request to Ollama API: {self.ollama_url}/api/generate")
            
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json=payload,
                timeout=60  # Increased timeout for DeepSeek
            )
            
            logger.info(f"📨 DeepSeek response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                analysis_text = result.get("response", "").strip()
                
                logger.info(f"🎯 DEEPSEEK RAW RESPONSE:")
                logger.info(f"   Response length: {len(analysis_text)} characters")
                logger.info(f"   Raw response: '{analysis_text[:500]}{'...' if len(analysis_text) > 500 else ''}'")
                
                # Try to parse JSON response
                try:
                    analysis = json.loads(analysis_text)
                    logger.info(f"✅ DeepSeek JSON parsing successful")
                    logger.info(f"📊 ANALYSIS RESULTS:")
                    logger.info(f"   Sentiment: {analysis.get('sentiment', 'unknown')}")
                    logger.info(f"   Key Topics: {analysis.get('key_topics', [])}")
                    logger.info(f"   Action Items: {analysis.get('action_items', [])}")
                    logger.info(f"   Summary: {analysis.get('summary', 'No summary')}")
                    return analysis
                except json.JSONDecodeError as e:
                    # Fallback if JSON parsing fails
                    logger.warning(f"⚠️  DeepSeek returned non-JSON response, using fallback. Parse error: {e}")
                    logger.warning(f"   Problematic response: '{analysis_text}'")
                    return {
                        "sentiment": "neutral",
                        "sentiment_score": 0.5,
                        "key_topics": ["general discussion"],
                        "action_items": [],
                        "speakers_detected": 1,
                        "urgency_level": "medium",
                        "summary": text[:200] + "..." if len(text) > 200 else text,
                        "keywords": [],
                        "raw_response": analysis_text
                    }
            else:
                logger.error(f"❌ Ollama API error: {response.status_code}")
                logger.error(f"   Error response: {response.text}")
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
                
        except Exception as e:
            logger.error(f"DeepSeek analysis failed: {e}")
            raise

async def main():
    """Main processing loop for communication with Node.js"""
    processor = AIProcessor()
    
    # Initialize
    init_result = await processor.initialize()
    print(json.dumps(init_result), flush=True)
    
    if not init_result["success"]:
        return
    
    # Process incoming audio data
    try:
        while True:
            line = sys.stdin.readline()
            if not line:
                break
                
            try:
                data = json.loads(line.strip())
                
                if data.get("type") == "audio_chunk":
                    result = await processor.process_audio_chunk(data.get("audio_data", ""))
                    print(json.dumps(result), flush=True)
                elif data.get("type") == "ping":
                    print(json.dumps({"success": True, "message": "pong"}), flush=True)
                else:
                    print(json.dumps({"success": False, "error": f"Unknown message type: {data.get('type')}"}), flush=True)
                    
            except json.JSONDecodeError as e:
                print(json.dumps({"success": False, "error": f"Invalid JSON: {e}"}), flush=True)
            except Exception as e:
                print(json.dumps({"success": False, "error": str(e)}), flush=True)
                
    except KeyboardInterrupt:
        logger.info("AI Processor shutting down...")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
