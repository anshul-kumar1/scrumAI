import requests
import yaml
import json
import sys
import asyncio
import httpx
from pathlib import Path

class ChatbotClient:
    def __init__(self, config_path=None):
        if config_path is None:
            config_path = Path(__file__).parent / "config.yaml"

        with open(config_path, "r") as file:
            config = yaml.safe_load(file)

        self.api_key = config["api_key"]
        self.base_url = config["model_server_base_url"]
        self.stream = config["stream"]
        self.stream_timeout = config["stream_timeout"]
        self.workspace_slug = config["workspace_slug"]

        if self.stream:
            self.chat_url = f"{self.base_url}/v1/workspace/{self.workspace_slug}/stream-chat"
        else:
            self.chat_url = f"{self.base_url}/v1/workspace/{self.workspace_slug}/chat"

        self.headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Bearer " + self.api_key
        }

        # Live transcript file path for immediate context
        self.live_transcript_file = None
        self.max_context_chars = 8000  # Limit context to prevent token overflow

    def set_live_transcript_file(self, file_path: str):
        """Set the live transcript file path for immediate context"""
        self.live_transcript_file = file_path

    def _get_live_context(self) -> str:
        """Read live transcript file for immediate context"""
        if not self.live_transcript_file:
            return ""

        try:
            with open(self.live_transcript_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Limit context size to prevent token overflow
            if len(content) > self.max_context_chars:
                lines = content.split('\n')
                # Keep the header and recent lines
                header_lines = []
                content_lines = []
                in_header = True

                for line in lines:
                    if in_header and (line.startswith('=') or not line.strip()):
                        header_lines.append(line)
                        if line.startswith('='):
                            in_header = False
                    else:
                        content_lines.append(line)

                # Take recent transcript lines that fit within limit
                header_text = '\n'.join(header_lines)
                remaining_chars = self.max_context_chars - len(header_text)

                recent_lines = []
                char_count = 0
                for line in reversed(content_lines):
                    if char_count + len(line) + 1 <= remaining_chars:
                        recent_lines.insert(0, line)
                        char_count += len(line) + 1
                    else:
                        break

                content = header_text + '\n' + '\n'.join(recent_lines)

            return content
        except Exception as e:
            print(f"Error reading live transcript: {e}")
            return ""

    def chat(self, message: str) -> str:
        """
        Send a chat request in non-streaming mode.
        Uses live transcript for immediate context.
        """
        # Get live context
        live_context = self._get_live_context()

        # Enhance message with context if available
        if live_context.strip():
            enhanced_message = f"""Meeting Context (Live Transcript):
{live_context}

User Question: {message}"""
        else:
            enhanced_message = message

        data = {
            "message": enhanced_message,
            "mode": "query"
        }
        try:
            chat_response = requests.post(
                self.chat_url,
                headers=self.headers,
                json=data
            )
            response_text = chat_response.text.strip()

            # Handle streaming response format
            if response_text.startswith('data: '):
                response_text = response_text[6:].strip()

            response_data = json.loads(response_text)
            return response_data.get('textResponse', str(response_data))
        except ValueError:
            return f"Response is not valid JSON. Raw response: {chat_response.text if 'chat_response' in locals() else 'No response'}"
        except Exception as e:
            return f"Chat request failed. Error: {e}"

    def chat_with_rag(self, message: str) -> str:
        """
        Send a chat request using only AnythingLLM's RAG capabilities.
        This uses embedded documents for semantic search.
        """
        data = {
            "message": message,
            "mode": "query"
        }
        try:
            chat_response = requests.post(
                self.chat_url,
                headers=self.headers,
                json=data
            )
            response_text = chat_response.text.strip()

            # Handle streaming response format
            if response_text.startswith('data: '):
                response_text = response_text[6:].strip()

            response_data = json.loads(response_text)
            return response_data.get('textResponse', str(response_data))
        except ValueError:
            return f"Response is not valid JSON. Raw response: {chat_response.text if 'chat_response' in locals() else 'No response'}"
        except Exception as e:
            return f"Chat request failed. Error: {e}"

    def streaming_chat(self, message: str):
        """
        Generator for streaming chat responses
        """
        data = {
            "message": message,
            "mode": "query"
        }

        response_text = ""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def async_stream():
            buffer = ""
            try:
                async with httpx.AsyncClient(timeout=self.stream_timeout) as client:
                    async with client.stream("POST", self.chat_url, headers=self.headers, json=data) as response:
                        async for chunk in response.aiter_text():
                            if chunk:
                                buffer += chunk
                                while "\n" in buffer:
                                    line, buffer = buffer.split("\n", 1)
                                    if line.startswith("data: "):
                                        line = line[len("data: "):]
                                    try:
                                        parsed_chunk = json.loads(line.strip())
                                        yield parsed_chunk.get("textResponse", "")
                                    except json.JSONDecodeError:
                                        continue
                                    except Exception as e:
                                        yield f"Error processing chunk: {e}"
            except httpx.RequestError as e:
                yield f"Streaming chat request failed. Error: {e}"

        agen = async_stream()
        try:
            while True:
                chunk = loop.run_until_complete(agen.__anext__())
                response_text += chunk
                yield response_text
        except StopAsyncIteration:
            pass
        finally:
            loop.close()
        yield response_text

def main():
    """CLI interface for testing"""
    client = ChatbotClient()

    try:
        while True:
            line = input().strip()
            if not line:
                continue

            if line.lower() == 'quit':
                break

            # Parse JSON input
            try:
                data = json.loads(line)
                command = data.get('command')
                message = data.get('message')
                transcript_file = data.get('transcript_file')

                # Set live transcript file if provided
                if transcript_file:
                    client.set_live_transcript_file(transcript_file)

                if command == 'chat':
                    response = client.chat(message)
                    print(json.dumps({"type": "response", "data": response}))
                    sys.stdout.flush()

                elif command == 'chat_rag':
                    response = client.chat_with_rag(message)
                    print(json.dumps({"type": "response", "data": response}))
                    sys.stdout.flush()

                elif command == 'stream':
                    print(json.dumps({"type": "stream_start"}))
                    sys.stdout.flush()

                    for chunk in client.streaming_chat(message):
                        print(json.dumps({"type": "stream_chunk", "data": chunk}))
                        sys.stdout.flush()

                    print(json.dumps({"type": "stream_end"}))
                    sys.stdout.flush()

            except json.JSONDecodeError:
                print(json.dumps({"type": "error", "data": "Invalid JSON input"}))
                sys.stdout.flush()
            except Exception as e:
                print(json.dumps({"type": "error", "data": str(e)}))
                sys.stdout.flush()

    except KeyboardInterrupt:
        pass
    except EOFError:
        pass

if __name__ == "__main__":
    main()