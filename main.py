"""FastAPI main application for WebSocket audio meeting server."""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "ScrumAI Meeting Server is running", "status": "healthy"}

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
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
