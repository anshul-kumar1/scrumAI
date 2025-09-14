import json
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.room_manager import RoomManager
from app.services.sfu_manager import SFUManager
from app.models import AudioMessage, StatusMessage
from app.config import BUFFER_DURATION_SECONDS, SAMPLE_RATE
from datetime import datetime

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)

# Global managers
room_manager = RoomManager()
sfu_manager = SFUManager()

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str = Query(...),
    participant_id: str = Query(...),
    name: Optional[str] = Query(None)
):
    """WebSocket endpoint for WebRTC signaling and SFU coordination."""
    await websocket.accept()
    
    # Join the room in both managers
    room_success = room_manager.join_room(room_id, participant_id, websocket, name)
    if not room_success:
        await websocket.send_json({
            "type": "error",
            "message": "Failed to join room. Room may be full or participant already exists."
        })
        await websocket.close()
        return
    
    # Add to SFU for media stream management
    sfu_manager.add_participant(room_id, participant_id, websocket)
    
    logger.info(f"Participant {participant_id} joined SFU room {room_id}")
    
    # Send initial room info and available streams
    await send_room_info(websocket, room_id, participant_id)
    
    # Notify other participants about the new joiner
    await broadcast_room_status(room_id, f"Participant {name or participant_id} joined")
    
    try:
        while True:
            # All communication is now JSON-based signaling
            message_data = await websocket.receive_json()
            message_type = message_data.get("type")
            
            if message_type in ["offer", "answer", "ice-candidate", "stream-added", "subscribe-to-stream"]:
                # Handle WebRTC signaling
                await sfu_manager.handle_webrtc_signaling(room_id, participant_id, message_data)
            
            elif message_type in ["mute", "unmute", "ping"]:
                # Handle control messages
                await handle_control_message(room_id, participant_id, message_data)
            
            elif message_type == "get-room-stats":
                # Send room statistics
                stats = sfu_manager.get_room_stats(room_id)
                await websocket.send_json({
                    "type": "room-stats",
                    "data": stats
                })
            
            else:
                logger.warning(f"Unknown message type: {message_type}")
    
    except WebSocketDisconnect:
        logger.info(f"Participant {participant_id} disconnected from SFU room {room_id}")
        
        # Clean up from both managers
        room_id_left = room_manager.leave_room(participant_id)
        sfu_manager.remove_participant(room_id, participant_id)
        
        if room_id_left:
            await broadcast_room_status(room_id_left, f"Participant {name or participant_id} left")


async def send_room_info(websocket: WebSocket, room_id: str, participant_id: str):
    """Send initial room information to a newly connected participant."""
    participants = room_manager.get_room_participants(room_id)
    available_streams = sfu_manager.get_available_streams(room_id, participant_id)
    
    # Convert participants to dict with JSON-serializable datetime
    participants_data = []
    for p in participants:
        participant_dict = p.model_dump()
        # Convert datetime to ISO string
        if 'joined_at' in participant_dict:
            participant_dict['joined_at'] = participant_dict['joined_at'].isoformat()
        participants_data.append(participant_dict)
    
    await websocket.send_json({
        "type": "room-info",
        "room_id": room_id,
        "participants": participants_data,
        "available_streams": available_streams,
        "your_participant_id": participant_id,
        "timestamp": datetime.now().isoformat()
    })





async def handle_control_message(room_id: str, participant_id: str, message: dict):
    """Handle control WebSocket messages (mute, unmute, etc.)."""

    message_type = message.get("type")
    
    if message_type == "mute":
        await broadcast_to_room(room_id, {
            "type": "participant_muted",
            "participant_id": participant_id,
            "timestamp": datetime.now().isoformat()
        }, exclude_participant=participant_id)
    
    elif message_type == "unmute":
        await broadcast_to_room(room_id, {
            "type": "participant_unmuted", 
            "participant_id": participant_id,
            "timestamp": datetime.now().isoformat()
        }, exclude_participant=participant_id)
    
    elif message_type == "ping":
        # Respond to heartbeat
        if (room_id in room_manager.connections and 
            participant_id in room_manager.connections[room_id]):
            websocket = room_manager.connections[room_id][participant_id]
            await websocket.send_json({
                "type": "pong", 
                "timestamp": datetime.now().isoformat()
            })


# Note: Audio forwarding is now handled by WebRTC peer connections
# The SFU server only handles signaling, not actual media forwarding
# In a production SFU, you'd use a media server like mediasoup, Janus, or Kurento


async def broadcast_to_room(room_id: str, message: dict, exclude_participant: Optional[str] = None):
    """Broadcast a JSON message to all participants in a room."""
    websockets = room_manager.get_participant_websockets(room_id, exclude_participant=exclude_participant)
    
    for websocket in websockets:
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send message to participant: {e}")


async def broadcast_room_status(room_id: str, status_message: str):
    """Broadcast room status update to all participants."""
    participants = room_manager.get_room_participants(room_id)
    
    # Convert participants to JSON-serializable format
    participants_data = []
    for p in participants:
        participant_dict = p.model_dump()
        if 'joined_at' in participant_dict:
            participant_dict['joined_at'] = participant_dict['joined_at'].isoformat()
        participants_data.append(participant_dict)
    
    status_data = {
        "type": "status",
        "room_id": room_id,
        "participants": participants_data,
        "message": status_message
    }
    
    await broadcast_to_room(room_id, status_data)