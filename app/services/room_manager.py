"""Room and participant management for multi-user meetings."""
from typing import Dict, List, Optional
from datetime import datetime
from fastapi import WebSocket
from app.models import RoomInfo, ParticipantInfo


class RoomManager:
    """Manages meeting rooms and participants."""
    
    def __init__(self):
        self.rooms: Dict[str, RoomInfo] = {}
        self.connections: Dict[str, Dict[str, WebSocket]] = {}  # room_id -> participant_id -> websocket
        self.participant_rooms: Dict[str, str] = {}  # participant_id -> room_id
    
    def create_room(self, room_id: str, max_participants: int = 10) -> RoomInfo:
        """Create a new meeting room."""
        if room_id not in self.rooms:
            self.rooms[room_id] = RoomInfo(
                room_id=room_id,
                created_at=datetime.now(),
                max_participants=max_participants
            )
            self.connections[room_id] = {}
        return self.rooms[room_id]
    
    def join_room(self, room_id: str, participant_id: str, websocket: WebSocket, name: Optional[str] = None) -> bool:
        """Add a participant to a room."""
        if room_id not in self.rooms:
            self.create_room(room_id)
        
        room = self.rooms[room_id]
        
        # Check room capacity
        if len(room.participants) >= room.max_participants:
            return False
        
        # Check if participant already in room
        if participant_id in [p.participant_id for p in room.participants]:
            return False
        
        # Add participant
        participant = ParticipantInfo(
            participant_id=participant_id,
            name=name,
            joined_at=datetime.now()
        )
        room.participants.append(participant)
        self.connections[room_id][participant_id] = websocket
        self.participant_rooms[participant_id] = room_id
        
        return True
    
    def leave_room(self, participant_id: str) -> Optional[str]:
        """Remove a participant from their room."""
        if participant_id not in self.participant_rooms:
            return None
        
        room_id = self.participant_rooms[participant_id]
        room = self.rooms[room_id]
        
        # Remove participant
        room.participants = [p for p in room.participants if p.participant_id != participant_id]
        
        # Clean up connections
        if participant_id in self.connections[room_id]:
            del self.connections[room_id][participant_id]
        
        del self.participant_rooms[participant_id]
        
        # Clean up empty rooms
        if not room.participants:
            del self.rooms[room_id]
            del self.connections[room_id]
        
        return room_id
    
    def get_room_participants(self, room_id: str) -> List[ParticipantInfo]:
        """Get all participants in a room."""
        if room_id not in self.rooms:
            return []
        return self.rooms[room_id].participants
    
    def get_participant_websockets(self, room_id: str, exclude_participant: Optional[str] = None) -> List[WebSocket]:
        """Get all WebSocket connections for a room, optionally excluding one participant."""
        if room_id not in self.connections:
            return []
        
        websockets = []
        for participant_id, websocket in self.connections[room_id].items():
            if exclude_participant and participant_id == exclude_participant:
                continue
            websockets.append(websocket)
        
        return websockets
    
    def get_participant_room(self, participant_id: str) -> Optional[str]:
        """Get the room ID for a participant."""
        return self.participant_rooms.get(participant_id)
