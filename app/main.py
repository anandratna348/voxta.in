
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.db.database import initialize_database
from app.api.routes.sessions import router as sessions_router
from app.api.routes.transcripts import router as transcripts_router
from app.api.routes.agent import router as agent_router
from app.api.routes.transcription import router as transcription_router
from app.api.routes.auth import router as auth_router

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
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(transcripts_router, prefix="/api/v1")
app.include_router(agent_router, prefix="/api/v1")
app.include_router(transcription_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "voxta-backend",
    }
