"""Data models for the application."""
from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime


class ParticipantInfo(BaseModel):
    """Information about a meeting participant."""
    participant_id: str
    name: Optional[str] = None
    joined_at: datetime
    is_audio_enabled: bool = True


class RoomInfo(BaseModel):
    """Information about a meeting room."""
    room_id: str
    created_at: datetime
    participants: List[ParticipantInfo] = []
    max_participants: int = 10


class AudioMessage(BaseModel):
    """WebSocket message for audio data."""
    type: str  # "audio", "join", "leave", "mute", "unmute"
    participant_id: str
    room_id: str
    data: Optional[bytes] = None
    timestamp: datetime


class StatusMessage(BaseModel):
    """WebSocket message for status updates."""
    type: str = "status"
    room_id: str
    participants: List[ParticipantInfo]
    message: str
