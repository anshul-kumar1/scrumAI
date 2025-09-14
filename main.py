"""FastAPI main application for WebSocket audio meeting server."""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from websocket import router as websocket_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="ScrumAI Meeting Server",
    description="WebSocket server for multi-participant audio meetings",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include WebSocket router
app.include_router(websocket_router, prefix="/api/v1")

# Serve static HTML files
@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "ScrumAI Meeting Server is running", "status": "healthy"}

@app.get("/client")
async def desktop_client():
    """Serve desktop client."""
    return FileResponse("client_example.html")

@app.get("/mobile")
async def mobile_client():
    """Serve mobile client."""
    return FileResponse("mobile_client.html")

@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "service": "scrumAI-meeting-server",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting SFU Server...")
    print("💻 For cross-computer testing, both computers should access:")
    print("   • http://localhost:8000/client (run this command on each computer)")
    print("   • Or use ngrok/tunneling service for external access")
    print()
    print("🔧 WebRTC requires HTTPS for remote connections.")
    print("   For production, set up proper SSL certificates.")
    print()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Listen on all interfaces
        port=8000,
        reload=True,
        log_level="info"
    )
