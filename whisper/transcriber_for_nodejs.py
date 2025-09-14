import numpy as np
import os
import queue
import sounddevice as sd
import sys
import threading
import yaml
import traceback
import json
import time

from concurrent.futures import ThreadPoolExecutor

# Add src directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from standalone_model import StandaloneWhisperModel


def flush_output():
    """Force flush stdout and stderr for better console output in executables"""
    sys.stdout.flush()
    sys.stderr.flush()


def process_transcription(
    whisper_model: StandaloneWhisperModel,
    chunk: np.ndarray,
    silence_threshold: float,
    sample_rate: int,
    full_transcript: list
) -> None:
    """
    Process a chunk of audio data and transcribe it using the Whisper model.
    This function is run in a separate thread to allow for concurrent processing.
    """

    try:
        if np.abs(chunk).mean() > silence_threshold:
            transcript = whisper_model.transcribe(chunk, sample_rate)
            if transcript.strip():
                timestamp = time.strftime('%H:%M:%S')
                transcript_data = {
                    "timestamp": timestamp,
                    "text": transcript.strip(),
                    "type": "transcript"
                }
                full_transcript.append(transcript_data)
                print(json.dumps(transcript_data))
                flush_output()
    except Exception as e:
        error_data = {
            "timestamp": time.strftime('%H:%M:%S'),
            "error": str(e),
            "type": "error"
        }
        print(json.dumps(error_data))
        flush_output()


def process_audio(
    whisper_model: StandaloneWhisperModel,
    audio_queue: queue.Queue,
    stop_event: threading.Event,
    max_workers: int,
    queue_timeout: float,
    chunk_samples: int,
    silence_threshold: float,
    sample_rate: int,
    full_transcript: list
) -> None:
    """
    Process audio data from the queue and transcribe it using the Whisper model.
    """

    buffer = np.empty((0,), dtype=np.float32)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []

        while not stop_event.is_set():
            try:
                audio_chunk = audio_queue.get(timeout=queue_timeout)
                audio_chunk = audio_chunk.flatten()
                buffer = np.concatenate([buffer, audio_chunk])

                while len(buffer) >= chunk_samples:
                    current_chunk = buffer[:chunk_samples]
                    buffer = buffer[chunk_samples:]

                    future = executor.submit(
                        process_transcription,
                        whisper_model,
                        current_chunk,
                        silence_threshold,
                        sample_rate,
                        full_transcript
                    )
                    futures = [f for f in futures if not f.done()] + [future]

            except queue.Empty:
                continue
            except Exception as e:
                error_data = {
                    "timestamp": time.strftime('%H:%M:%S'),
                    "error": f"Error in audio processing: {e}",
                    "type": "error"
                }
                print(json.dumps(error_data))
                flush_output()

        # Wait for transcription futures to complete
        for future in futures:
            try:
                future.result()
            except Exception as e:
                error_data = {
                    "timestamp": time.strftime('%H:%M:%S'),
                    "error": f"Error in future result: {e}",
                    "type": "error"
                }
                print(json.dumps(error_data))
                flush_output()


def record_audio(
    audio_queue: queue.Queue,
    stop_event: threading.Event,
    sample_rate: int,
    channels: int
) -> None:
    """
    Record audio from the microphone and put it into the audio queue.
    """

    def audio_callback(indata, frames, time, status):
        """Callback function for audio input stream."""
        if not stop_event.is_set():
            audio_queue.put(indata.copy())

    try:
        with sd.InputStream(
            samplerate=sample_rate,
            channels=channels,
            callback=audio_callback
        ):
            status_data = {
                "timestamp": time.strftime('%H:%M:%S'),
                "message": "Microphone stream initialized",
                "type": "status"
            }
            print(json.dumps(status_data))
            flush_output()
            stop_event.wait()
    except Exception as e:
        error_data = {
            "timestamp": time.strftime('%H:%M:%S'),
            "error": f"Error in audio recording: {e}",
            "type": "error"
        }
        print(json.dumps(error_data))
        flush_output()


class NodeJSWhisperTranscriber:
    def __init__(self):
        self.full_transcript = []

        status_data = {
            "timestamp": time.strftime('%H:%M:%S'),
            "message": "Starting Whisper Transcription for Node.js",
            "type": "status"
        }
        print(json.dumps(status_data))
        flush_output()

        try:
            config_path = os.path.join(current_dir, "config.yaml")
            with open(config_path, "r") as f:
                config = yaml.safe_load(f)

            status_data = {
                "timestamp": time.strftime('%H:%M:%S'),
                "message": "Configuration loaded successfully",
                "type": "status"
            }
            print(json.dumps(status_data))
            flush_output()

            # audio settings
            self.sample_rate = config.get("sample_rate", 16000)
            self.chunk_duration = config.get("chunk_duration", 4)
            self.channels = config.get("channels", 1)

            # processing settings
            self.max_workers = config.get("max_workers", 4)
            self.silence_threshold = config.get("silence_threshold", 0.001)
            self.queue_timeout = config.get("queue_timeout", 1.0)
            self.chunk_samples = int(self.sample_rate * self.chunk_duration)

            # model paths - resolve relative to script directory
            encoder_rel_path = config.get("encoder_path", "models/WhisperEncoder.onnx")
            decoder_rel_path = config.get("decoder_path", "models/WhisperDecoder.onnx")

            # Make paths absolute relative to the script's directory
            self.encoder_path = os.path.join(current_dir, encoder_rel_path)
            self.decoder_path = os.path.join(current_dir, decoder_rel_path)

            # check that the model paths exist
            if not os.path.exists(self.encoder_path):
                error_data = {
                    "timestamp": time.strftime('%H:%M:%S'),
                    "error": f"Encoder model not found at {self.encoder_path}",
                    "type": "error"
                }
                print(json.dumps(error_data))
                flush_output()
                sys.exit(1)

            if not os.path.exists(self.decoder_path):
                error_data = {
                    "timestamp": time.strftime('%H:%M:%S'),
                    "error": f"Decoder model not found at {self.decoder_path}",
                    "type": "error"
                }
                print(json.dumps(error_data))
                flush_output()
                sys.exit(1)

            status_data = {
                "timestamp": time.strftime('%H:%M:%S'),
                "message": "Model files found",
                "type": "status"
            }
            print(json.dumps(status_data))
            flush_output()

            # initialize the model
            status_data = {
                "timestamp": time.strftime('%H:%M:%S'),
                "message": "Loading Whisper model...",
                "type": "status"
            }
            print(json.dumps(status_data))
            flush_output()

            self.model = StandaloneWhisperModel(self.encoder_path, self.decoder_path)

            status_data = {
                "timestamp": time.strftime('%H:%M:%S'),
                "message": "Model loaded successfully!",
                "type": "status"
            }
            print(json.dumps(status_data))
            flush_output()

            # initialize the audio queue and stop event
            self.audio_queue = queue.Queue()
            self.stop_event = threading.Event()

        except Exception as e:
            error_data = {
                "timestamp": time.strftime('%H:%M:%S'),
                "error": f"Error during initialization: {e}",
                "type": "error"
            }
            print(json.dumps(error_data))
            flush_output()
            sys.exit(1)

    def run(self):
        """Run the live transcription."""

        try:
            # launch the audio processing and recording threads
            process_thread = threading.Thread(
                target=process_audio,
                args=(
                    self.model,
                    self.audio_queue,
                    self.stop_event,
                    self.max_workers,
                    self.queue_timeout,
                    self.chunk_samples,
                    self.silence_threshold,
                    self.sample_rate,
                    self.full_transcript
                )
            )
            process_thread.start()

            record_thread = threading.Thread(
                target=record_audio,
                args=(
                    self.audio_queue,
                    self.stop_event,
                    self.sample_rate,
                    self.channels
                )
            )
            record_thread.start()

            # wait for threads to finish
            try:
                while True:
                    record_thread.join(timeout=0.1)
                    if not record_thread.is_alive():
                        break
            except KeyboardInterrupt:
                status_data = {
                    "timestamp": time.strftime('%H:%M:%S'),
                    "message": "Stopping transcription...",
                    "type": "status"
                }
                print(json.dumps(status_data))
                flush_output()
            finally:
                self.stop_event.set()
                record_thread.join()
                process_thread.join()

        except Exception as e:
            error_data = {
                "timestamp": time.strftime('%H:%M:%S'),
                "error": f"Error during execution: {e}",
                "type": "error"
            }
            print(json.dumps(error_data))
            flush_output()

    def get_full_transcript(self):
        """Return the full transcript as formatted text."""
        transcript_text = ""
        for entry in self.full_transcript:
            if entry["type"] == "transcript":
                transcript_text += f"[{entry['timestamp']}] {entry['text']}\n"
        return transcript_text

    def stop_transcription(self):
        """Stop the transcription process."""
        self.stop_event.set()


if __name__ == "__main__":
    transcriber = NodeJSWhisperTranscriber()
    transcriber.run()