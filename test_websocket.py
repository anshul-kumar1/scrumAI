"""Simple test script for the SFU WebSocket connection."""
import asyncio
import websockets
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_websocket_connection():
    """Test basic WebSocket connection to the SFU server."""
    uri = "ws://localhost:8000/api/v1/ws?room_id=test-room&participant_id=test-user-1"
    
    try:
        async with websockets.connect(uri) as websocket:
            logger.info("Connected to SFU server")
            
            # Wait for initial room-info message
            message = await websocket.recv()
            data = json.loads(message)
            logger.info(f"Received: {data}")
            
            # Send a ping
            ping_message = {"type": "ping"}
            await websocket.send(json.dumps(ping_message))
            logger.info("Sent ping")
            
            # Wait for pong
            response = await websocket.recv()
            pong_data = json.loads(response)
            logger.info(f"Received pong: {pong_data}")
            
            # Send stream-added message
            stream_message = {
                "type": "stream-added",
                "stream_id": "test-audio-stream-123",
                "stream_type": "audio"
            }
            await websocket.send(json.dumps(stream_message))
            logger.info("Announced audio stream")
            
            # Get room stats
            stats_message = {"type": "get-room-stats"}
            await websocket.send(json.dumps(stats_message))
            logger.info("Requested room stats")
            
            # Wait for stats response
            stats_response = await websocket.recv()
            stats_data = json.loads(stats_response)
            logger.info(f"Room stats: {stats_data}")
            
            logger.info("WebSocket test completed successfully!")
            
    except Exception as e:
        logger.error(f"WebSocket test failed: {e}")


async def test_multi_participant():
    """Test multiple participants connecting simultaneously."""
    async def create_participant(participant_id):
        uri = f"ws://localhost:8000/api/v1/ws?room_id=multi-test&participant_id={participant_id}"
        
        try:
            async with websockets.connect(uri) as websocket:
                logger.info(f"Participant {participant_id} connected")
                
                # Receive room info
                message = await websocket.recv()
                data = json.loads(message)
                logger.info(f"Participant {participant_id} received: {data['type']}")
                
                # Announce stream
                stream_message = {
                    "type": "stream-added",
                    "stream_id": f"audio-{participant_id}",
                    "stream_type": "audio"
                }
                await websocket.send(json.dumps(stream_message))
                
                # Wait a bit to simulate real usage
                await asyncio.sleep(2)
                
                # Get room stats
                stats_message = {"type": "get-room-stats"}
                await websocket.send(json.dumps(stats_message))
                
                # Wait for stats
                stats_response = await websocket.recv()
                stats_data = json.loads(stats_response)
                logger.info(f"Participant {participant_id} sees {stats_data['data']['participants']} participants")
                
                await asyncio.sleep(1)
                
        except Exception as e:
            logger.error(f"Participant {participant_id} failed: {e}")
    
    # Create 3 participants simultaneously
    participants = ["alice", "bob", "charlie"]
    tasks = [create_participant(p) for p in participants]
    
    await asyncio.gather(*tasks)
    logger.info("Multi-participant test completed!")


if __name__ == "__main__":
    print("Testing SFU WebSocket Connection...")
    print("Make sure the server is running: python main.py")
    print()
    
    # Test basic connection
    print("1. Testing basic WebSocket connection...")
    asyncio.run(test_websocket_connection())
    
    print()
    print("2. Testing multiple participants...")
    asyncio.run(test_multi_participant())
    
    print()
    print("All tests completed!")
