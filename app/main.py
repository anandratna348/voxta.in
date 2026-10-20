
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.db.database import initialize_database

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the local SQLite database on startup
    initialize_database()
    yield


app = FastAPI(
    title="Voxta API",
    description="Local-first meeting transcription backend",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "voxta-backend",
    }
