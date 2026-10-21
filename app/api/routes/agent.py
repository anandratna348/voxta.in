
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.gemini_service import GeminiServiceError
from app.services.transcript_processor import TranscriptProcessor

router = APIRouter(prefix="/agent", tags=["Interview Agent"])

processor = TranscriptProcessor()


class ProcessTranscriptRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=128)
    text: str = Field(min_length=1, max_length=20_000)
    context: str = Field(default="", max_length=12_000)


@router.post("/process-transcript")
def process_transcript(payload: ProcessTranscriptRequest):
    try:
        return processor.process_segment(
            user_id=payload.user_id,
            text=payload.text,
            context=payload.context,
        )
    except GeminiServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
