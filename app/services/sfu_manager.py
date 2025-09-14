"""SFU (Selective Forwarding Unit) manager for WebRTC media streams."""
import logging
import asyncio
from typing import Dict, List, Optional, Set
from datetime import datetime
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class MediaStream:
    """Represents a media stream from a participant."""
    
    def __init__(self, participant_id: str, stream_id: str, stream_type: str = "audio"):
        self.participant_id = participant_id
        self.stream_id = stream_id
        self.stream_type = stream_type
        self.created_at = datetime.now()
        self.is_active = True
        self.subscribers: Set[str] = set()  # participant_ids subscribed to this stream


class SFUManager:
    """Manages WebRTC streams and selective forwarding."""
    
    def __init__(self):
        # room_id -> participant_id -> list of MediaStream
        self.streams: Dict[str, Dict[str, List[MediaStream]]] = {}
        
        # room_id -> participant_id -> websocket (for signaling)
        self.signaling_connections: Dict[str, Dict[str, WebSocket]] = {}
        
        # Track peer connections and ICE candidates
        # room_id -> participant_id -> peer_connection_data
        self.peer_connections: Dict[str, Dict[str, Dict]] = {}
        
        # For AI processing - tap into streams without affecting forwarding
        self.ai_processors: Dict[str, List] = {}  # room_id -> list of processors
    
    def add_participant(self, room_id: str, participant_id: str, websocket: WebSocket):
        """Add a participant to SFU for signaling."""
        if room_id not in self.signaling_connections:
            self.signaling_connections[room_id] = {}
            self.streams[room_id] = {}
            self.peer_connections[room_id] = {}
        
        self.signaling_connections[room_id][participant_id] = websocket
        self.streams[room_id][participant_id] = []
        self.peer_connections[room_id][participant_id] = {}
        
        logger.info(f"Added participant {participant_id} to SFU room {room_id}")
    
    def remove_participant(self, room_id: str, participant_id: str):
        """Remove participant and cleanup their streams."""
        if room_id not in self.signaling_connections:
            return
        
        # Remove from signaling
        if participant_id in self.signaling_connections[room_id]:
            del self.signaling_connections[room_id][participant_id]
        
        # Remove their streams
        if participant_id in self.streams[room_id]:
            streams = self.streams[room_id][participant_id]
            for stream in streams:
                stream.is_active = False
            del self.streams[room_id][participant_id]
        
        # Remove peer connection data
        if participant_id in self.peer_connections[room_id]:
            del self.peer_connections[room_id][participant_id]
        
        # Clean up empty rooms
        if not self.signaling_connections[room_id]:
            del self.signaling_connections[room_id]
            del self.streams[room_id]
            del self.peer_connections[room_id]
        
        logger.info(f"Removed participant {participant_id} from SFU room {room_id}")
    
    def add_stream(self, room_id: str, participant_id: str, stream_id: str, stream_type: str = "audio"):
        """Add a media stream from a participant."""
        if room_id not in self.streams or participant_id not in self.streams[room_id]:
            logger.error(f"Participant {participant_id} not found in room {room_id}")
            return False
        
        stream = MediaStream(participant_id, stream_id, stream_type)
        self.streams[room_id][participant_id].append(stream)
        
        logger.info(f"Added {stream_type} stream {stream_id} from {participant_id} in room {room_id}")
        return True
    
    def get_available_streams(self, room_id: str, requesting_participant_id: str) -> List[Dict]:
        """Get all available streams in a room (excluding requester's own streams)."""
        if room_id not in self.streams:
            return []
        
        available_streams = []
        for participant_id, streams in self.streams[room_id].items():
            if participant_id == requesting_participant_id:
                continue
            
            for stream in streams:
                if stream.is_active:
                    available_streams.append({
                        "participant_id": participant_id,
                        "stream_id": stream.stream_id,
                        "stream_type": stream.stream_type,
                        "created_at": stream.created_at.isoformat()
                    })
        
        return available_streams
    
    async def handle_webrtc_signaling(self, room_id: str, participant_id: str, message: Dict):
        """Handle WebRTC signaling messages (offer, answer, ICE candidates)."""
        message_type = message.get("type")
        target_participant = message.get("target_participant_id")
        
        if message_type in ["offer", "answer"]:
            await self._forward_signaling_message(room_id, participant_id, target_participant, message)
        
        elif message_type == "ice-candidate":
            await self._forward_ice_candidate(room_id, participant_id, target_participant, message)
        
        elif message_type == "stream-added":
            # Participant is announcing a new stream
            stream_id = message.get("stream_id")
            stream_type = message.get("stream_type", "audio")
            self.add_stream(room_id, participant_id, stream_id, stream_type)
            
            # Notify other participants about the new stream
            await self._notify_new_stream(room_id, participant_id, stream_id, stream_type)
        
        elif message_type == "subscribe-to-stream":
            # Participant wants to subscribe to another participant's stream
            target_participant = message.get("stream_owner_id")
            stream_id = message.get("stream_id")
            await self._handle_stream_subscription(room_id, participant_id, target_participant, stream_id)
    
    async def _forward_signaling_message(self, room_id: str, sender_id: str, target_id: str, message: Dict):
        """Forward WebRTC signaling message to target participant."""
        if (room_id not in self.signaling_connections or 
            target_id not in self.signaling_connections[room_id]):
            logger.error(f"Target participant {target_id} not found for signaling")
            return
        
        target_websocket = self.signaling_connections[room_id][target_id]
        
        # Add sender info to message
        forwarded_message = {
            **message,
            "from_participant_id": sender_id,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            await target_websocket.send_json(forwarded_message)
            logger.debug(f"Forwarded {message['type']} from {sender_id} to {target_id}")
        except Exception as e:
            logger.error(f"Failed to forward signaling message: {e}")
    
    async def _forward_ice_candidate(self, room_id: str, sender_id: str, target_id: str, message: Dict):
        """Forward ICE candidate to target participant."""
        await self._forward_signaling_message(room_id, sender_id, target_id, message)
    
    async def _notify_new_stream(self, room_id: str, stream_owner_id: str, stream_id: str, stream_type: str):
        """Notify all other participants about a new stream."""
        if room_id not in self.signaling_connections:
            return
        
        notification = {
            "type": "stream-available",
            "stream_owner_id": stream_owner_id,
            "stream_id": stream_id,
            "stream_type": stream_type,
            "timestamp": datetime.now().isoformat()
        }
        
        # Send to all participants except the stream owner
        for participant_id, websocket in self.signaling_connections[room_id].items():
            if participant_id == stream_owner_id:
                continue
            
            try:
                await websocket.send_json(notification)
            except Exception as e:
                logger.error(f"Failed to notify participant {participant_id} about new stream: {e}")
    
    async def _handle_stream_subscription(self, room_id: str, subscriber_id: str, stream_owner_id: str, stream_id: str):
        """Handle a participant subscribing to another's stream."""
        # In a real SFU, this would set up the media forwarding
        # For now, we'll just track the subscription
        
        if (room_id in self.streams and 
            stream_owner_id in self.streams[room_id]):
            
            for stream in self.streams[room_id][stream_owner_id]:
                if stream.stream_id == stream_id:
                    stream.subscribers.add(subscriber_id)
                    logger.info(f"Participant {subscriber_id} subscribed to stream {stream_id} from {stream_owner_id}")
                    break
    
    def get_room_stats(self, room_id: str) -> Dict:
        """Get statistics for a room."""
        if room_id not in self.streams:
            return {"error": "Room not found"}
        
        total_streams = 0
        active_streams = 0
        participants = len(self.streams[room_id])
        
        for participant_streams in self.streams[room_id].values():
            total_streams += len(participant_streams)
            active_streams += sum(1 for stream in participant_streams if stream.is_active)
        
        return {
            "room_id": room_id,
            "participants": participants,
            "total_streams": total_streams,
            "active_streams": active_streams,
            "timestamp": datetime.now().isoformat()
        }
