"""
Main Backend Entry Point

This is the main FastAPI application that combines all layers.
Each layer is implemented as a separate router module.
"""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from root .env
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

# Import routers from each layer
from layer1.routes import router as layer1_router
from layer2.routes import router as layer2_router

# Create main FastAPI application
app = FastAPI(
    title="Risk Classification Dataset Generator",
    description="AI-powered tool for generating domain-specific risk classification datasets",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with prefixes
app.include_router(layer1_router, prefix="/api/layer1", tags=["Layer 1 - Risk Classification"])
app.include_router(layer2_router, prefix="/api/layer2", tags=["Layer 2 - Future Development"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Risk Classification Dataset Generator",
        "layers": {
            "layer1": "/api/layer1",
            "layer2": "/api/layer2"
        }
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
