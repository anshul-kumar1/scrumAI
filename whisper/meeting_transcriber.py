import numpy as np
import os
import queue
import sys
import threading
import time
import yaml
import requests
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional, Callable

# Add chatbot path for AnythingLLM client
chatbot_path = Path("C:/Users/qc_de/local/simple-npu-chatbot/src")
if str(chatbot_path) not in sys.path:
    sys.path.insert(0, str(chatbot_path))

# Import existing components
from standalone_model import StandaloneWhisperModel


@dataclass
class TranscriptSegment:
    """A segment of transcribed text with timestamp"""
    text: str
    timestamp: datetime
    confidence: float = 0.0


class AnythingLLMClient:
    """Client for AnythingLLM API with document upload capabilities"""

    def __init__(self, config_path: str = None):
        config_path = config_path or str(chatbot_path / "config.yaml")

        with open(config_path, "r") as f:
            config = yaml.safe_load(f)

        self.api_key = config["api_key"]
        self.base_url = config["model_server_base_url"]
        self.workspace_slug = config["workspace_slug"]

        self.headers = {
            "accept": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        self.chat_headers = {
            **self.headers,
            "Content-Type": "application/json"
        }

        print(f"Connected to AnythingLLM workspace: {self.workspace_slug}")

    def upload_transcript_document(self, content: str, filename: str) -> bool:
        """Upload transcript content as a document to AnythingLLM"""
        try:
            # Create temporary file for upload
            temp_file_path = f"temp_{filename}.txt"
            with open(temp_file_path, 'w', encoding='utf-8') as f:
                f.write(content)

            # Upload file to AnythingLLM
            upload_url = f"{self.base_url}/document/upload"

            with open(temp_file_path, 'rb') as f:
                files = {'file': (filename + '.txt', f, 'text/plain')}
                response = requests.post(upload_url, headers=self.headers, files=files)

            # Clean up temp file
            os.remove(temp_file_path)

            if response.status_code == 200:
                result = response.json()
                print(f"[UPLOAD] Document uploaded: {filename}")

                # Add document to workspace
                self.add_document_to_workspace(result.get('location'))
                return True
            else:
                print(f"[ERROR] Upload failed: {response.status_code}")
                return False

        except Exception as e:
            print(f"[ERROR] Document upload error: {e}")
            return False

    def add_document_to_workspace(self, document_location: str) -> bool:
        """Add an uploaded document to the workspace"""
        try:
            add_url = f"{self.base_url}/workspace/{self.workspace_slug}/update-embeddings"

            data = {
                "adds": [document_location]
            }

            response = requests.post(add_url, headers=self.chat_headers, json=data)

            if response.status_code == 200:
                print(f"[SUCCESS] Document added to workspace")
                return True
            else:
                print(f"[ERROR] Failed to add to workspace: {response.status_code}")
                return False

        except Exception as e:
            print(f"[ERROR] Add to workspace error: {e}")
            return False

    def chat(self, message: str, session_id: str = None) -> str:
        """Send a chat message to AnythingLLM"""
        try:
            chat_url = f"{self.base_url}/workspace/{self.workspace_slug}/chat"

            data = {
                "message": message,
                "mode": "chat",
                "sessionId": session_id or f"meeting-{int(time.time())}",
                "attachments": []
            }

            response = requests.post(chat_url, headers=self.chat_headers, json=data)

            if response.status_code == 200:
                return response.json().get('textResponse', 'No response received')
            else:
                return f"Error: HTTP {response.status_code}"

        except Exception as e:
            return f"Chat error: {e}"


class MeetingTranscriber:
    """Main class for live meeting transcription with AnythingLLM integration"""

    def __init__(self, whisper_config_path: str = "config.yaml", llm_config_path: str = None):
        self.session_id = f"meeting_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Load whisper configuration
        self._load_whisper_config(whisper_config_path)

        # Initialize components
        self.whisper_model = StandaloneWhisperModel(self.encoder_path, self.decoder_path)
        self.llm_client = AnythingLLMClient(llm_config_path)

        # Audio processing
        self.audio_queue = queue.Queue()
        self.stop_event = threading.Event()

        # Transcript management
        self.transcript_segments: List[TranscriptSegment] = []
        self.transcript_buffer = []
        self.buffer_size = 10  # Segments to buffer before uploading

        # Live transcript file for real-time access
        self.live_transcript_file = f"../meetingnotes_{datetime.now().strftime('%Y-%m-%dT%H-%M-%S-%f')[:-3]}Z.txt"
        self.transcript_lock = threading.Lock()

        # Initialize live transcript file
        with open(self.live_transcript_file, 'w', encoding='utf-8') as f:
            f.write(f"Meeting Session: {self.session_id}\n")
            f.write(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 60 + "\n\n")

        # Callbacks
        self.on_transcript_callback: Optional[Callable[[str], None]] = None

        print(f"[INIT] Meeting Transcriber initialized (Session: {self.session_id})")
        print(f"[TRANSCRIPT] Live transcript: {self.live_transcript_file}")

    def _load_whisper_config(self, config_path: str):
        """Load whisper configuration"""
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)

        self.sample_rate = config.get("sample_rate", 16000)
        self.chunk_duration = config.get("chunk_duration", 4)
        self.channels = config.get("channels", 1)
        self.max_workers = config.get("max_workers", 4)
        self.silence_threshold = config.get("silence_threshold", 0.001)
        self.queue_timeout = config.get("queue_timeout", 1.0)
        self.chunk_samples = int(self.sample_rate * self.chunk_duration)

        self.encoder_path = config.get("encoder_path", "models/WhisperEncoder.onnx")
        self.decoder_path = config.get("decoder_path", "models/WhisperDecoder.onnx")

        # Verify model files
        for path in [self.encoder_path, self.decoder_path]:
            if not os.path.exists(path):
                raise FileNotFoundError(f"Model file not found: {path}")

    def set_transcript_callback(self, callback: Callable[[str], None]):
        """Set callback for real-time transcript updates"""
        self.on_transcript_callback = callback

    def start_meeting(self):
        """Start the meeting transcription"""
        print("[START] Starting meeting transcription...")

        # Start threads
        record_thread = threading.Thread(target=self._record_audio, daemon=True)
        process_thread = threading.Thread(target=self._process_audio, daemon=True)

        record_thread.start()
        process_thread.start()

        return record_thread, process_thread

    def stop_meeting(self):
        """Stop transcription and finalize meeting"""
        print("[STOP] Stopping meeting...")
        self.stop_event.set()

        # Upload any remaining transcript buffer
        if self.transcript_buffer:
            self._upload_transcript_batch()

        # Upload full meeting transcript
        self._upload_final_transcript()

    def ask_question(self, question: str) -> str:
        """Ask a question about the meeting using AnythingLLM's RAG"""
        return self.llm_client.chat(question, self.session_id)

    def generate_meeting_notes(self) -> str:
        """Generate meeting notes using AnythingLLM"""
        prompt = """
        Based on our meeting conversation, please generate comprehensive meeting notes including:
        1. Key discussion points and topics covered
        2. Important decisions made
        3. Action items and next steps
        4. Main takeaways and conclusions

        Format the response as structured meeting notes.
        """
        return self.llm_client.chat(prompt, self.session_id)

    def _record_audio(self):
        """Record audio from microphone"""
        import sounddevice as sd

        def audio_callback(indata, frames, time, status):
            if not self.stop_event.is_set():
                self.audio_queue.put(indata.copy())

        try:
            with sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.channels,
                callback=audio_callback
            ):
                print("[AUDIO] Microphone active - recording started")
                self.stop_event.wait()
        except Exception as e:
            print(f"[ERROR] Audio recording error: {e}")

    def _process_audio(self):
        """Process audio chunks and generate transcripts"""
        buffer = np.empty((0,), dtype=np.float32)

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            while not self.stop_event.is_set():
                try:
                    audio_chunk = self.audio_queue.get(timeout=self.queue_timeout)
                    audio_chunk = audio_chunk.flatten()
                    buffer = np.concatenate([buffer, audio_chunk])

                    while len(buffer) >= self.chunk_samples:
                        current_chunk = buffer[:self.chunk_samples]
                        buffer = buffer[self.chunk_samples:]

                        executor.submit(self._transcribe_chunk, current_chunk)

                except queue.Empty:
                    continue
                except Exception as e:
                    print(f"[ERROR] Audio processing error: {e}")

    def _transcribe_chunk(self, audio_chunk: np.ndarray):
        """Transcribe a single audio chunk"""
        try:
            if np.abs(audio_chunk).mean() > self.silence_threshold:
                transcript_text = self.whisper_model.transcribe(audio_chunk, self.sample_rate)

                if transcript_text.strip():
                    segment = TranscriptSegment(
                        text=transcript_text.strip(),
                        timestamp=datetime.now()
                    )

                    # Add to segments and buffer
                    self.transcript_segments.append(segment)
                    self.transcript_buffer.append(segment)

                    # Write to live transcript file immediately
                    self._write_to_live_transcript(segment)

                    # Output for Node.js integration
                    timestamp_str = segment.timestamp.strftime('%H:%M:%S')
                    transcript_data = {
                        "timestamp": timestamp_str,
                        "text": segment.text,
                        "type": "transcript",
                        "transcriptFile": os.path.abspath(self.live_transcript_file)
                    }

                    # Output JSON for Node.js
                    print(json.dumps(transcript_data))
                    sys.stdout.flush()

                    # Call callback
                    if self.on_transcript_callback:
                        self.on_transcript_callback(f"[{timestamp_str}]: {segment.text}")

                    # Upload batch if buffer is full
                    if len(self.transcript_buffer) >= self.buffer_size:
                        self._upload_transcript_batch()

        except Exception as e:
            error_data = {
                "type": "error",
                "error": str(e),
                "timestamp": datetime.now().strftime('%H:%M:%S')
            }
            print(json.dumps(error_data))
            sys.stdout.flush()

    def _write_to_live_transcript(self, segment: TranscriptSegment):
        """Write segment to live transcript file immediately"""
        try:
            with self.transcript_lock:
                with open(self.live_transcript_file, 'a', encoding='utf-8') as f:
                    timestamp_str = segment.timestamp.strftime('%H:%M:%S')
                    f.write(f"[{timestamp_str}]: {segment.text}\n")
                    f.flush()  # Ensure immediate write to disk
        except Exception as e:
            print(f"[ERROR] Live transcript write error: {e}")

    def get_live_transcript_path(self):
        """Get the path to the live transcript file"""
        return self.live_transcript_file

    def _upload_transcript_batch(self):
        """Upload current transcript buffer to AnythingLLM"""
        if not self.transcript_buffer:
            return

        try:
            # Create batch content
            batch_content = f"Meeting Transcript Batch - {datetime.now().strftime('%H:%M:%S')}\n"
            batch_content += "=" * 60 + "\n\n"

            for segment in self.transcript_buffer:
                timestamp_str = segment.timestamp.strftime('%H:%M:%S')
                batch_content += f"[{timestamp_str}]: {segment.text}\n"

            # Upload to AnythingLLM
            batch_filename = f"{self.session_id}_batch_{len(self.transcript_segments)}"
            success = self.llm_client.upload_transcript_document(batch_content, batch_filename)

            if success:
                print(f"[UPLOAD] Uploaded batch with {len(self.transcript_buffer)} segments")

            # Clear buffer
            self.transcript_buffer = []

        except Exception as e:
            print(f"[ERROR] Batch upload error: {e}")

    def _upload_final_transcript(self):
        """Upload complete meeting transcript"""
        if not self.transcript_segments:
            return

        try:
            # Create full transcript
            full_content = f"Complete Meeting Transcript - {self.session_id}\n"
            full_content += f"Meeting Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            full_content += f"Duration: {len(self.transcript_segments)} segments\n"
            full_content += "=" * 80 + "\n\n"

            for segment in self.transcript_segments:
                timestamp_str = segment.timestamp.strftime('%H:%M:%S')
                full_content += f"[{timestamp_str}]: {segment.text}\n"

            # Upload final transcript
            filename = f"{self.session_id}_complete_transcript"
            success = self.llm_client.upload_transcript_document(full_content, filename)

            if success:
                print(f"[UPLOAD] Final transcript uploaded with {len(self.transcript_segments)} segments")

        except Exception as e:
            print(f"[ERROR] Final transcript upload error: {e}")


def main():
    """Main function to run the meeting transcriber"""
    transcriber = MeetingTranscriber()

    try:
        # Start meeting
        threads = transcriber.start_meeting()

        print("\n" + "="*70)
        print("[ACTIVE] ANYTHINGLLM MEETING TRANSCRIBER ACTIVE")
        print("   • Live transcription streaming to your workspace")
        print("   • RAG-powered context available for questions")
        print("   • Type 'ask: <question>' to query meeting content")
        print("   • Type 'notes' to generate meeting notes")
        print("   • Press Ctrl+C to stop and finalize")
        print("="*70 + "\n")

        # Interactive loop
        while True:
            try:
                user_input = input().strip()

                if user_input.lower().startswith('ask:'):
                    question = user_input[4:].strip()
                    if question:
                        print(f"\n[QUESTION] Question: {question}")
                        answer = transcriber.ask_question(question)
                        print(f"[ANSWER] Answer: {answer}\n")

                elif user_input.lower() == 'notes':
                    print("\n[NOTES] Generating meeting notes...")
                    notes = transcriber.generate_meeting_notes()
                    print("[NOTES] Meeting Notes:")
                    print("-" * 50)
                    print(notes)
                    print("-" * 50 + "\n")

            except KeyboardInterrupt:
                break

    except KeyboardInterrupt:
        pass
    finally:
        # Stop and finalize
        transcriber.stop_meeting()
        print(f"\n[COMPLETE] Meeting session {transcriber.session_id} completed")
        print("[COMPLETE] All transcripts have been uploaded to your AnythingLLM workspace")
        print("[COMPLETE] You can now ask questions about this meeting anytime!")


if __name__ == "__main__":
    main()