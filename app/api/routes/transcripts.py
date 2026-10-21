
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field, model_validator

from app.db.database import get_connection

router = APIRouter(prefix="/sessions", tags=["Transcripts"])


class TranscriptSegmentCreate(BaseModel):
    sequence_number: int = Field(ge=0)
    speaker_label: str | None = Field(default=None, max_length=80)
    text: str = Field(min_length=1, max_length=20_000)
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)

    @model_validator(mode="after")
    def validate_timestamps(self):
        if self.end_ms < self.start_ms:
            raise ValueError("end_ms must be greater than or equal to start_ms")
        return self


class TranscriptSegmentResponse(BaseModel):
    id: str
    session_id: str
    sequence_number: int
    speaker_label: str | None
    text: str
    start_ms: int
    end_ms: int


@router.post(
    "/{session_id}/segments",
    response_model=TranscriptSegmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_segment(session_id: str, payload: TranscriptSegmentCreate):
    segment_id = str(uuid4())

    with get_connection() as connection:
        session = connection.execute(
            "SELECT id FROM meeting_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()

        if session is None:
            raise HTTPException(status_code=404, detail="Meeting session not found")

        try:
            connection.execute(
                """
                INSERT INTO transcript_segments
                (id, session_id, sequence_number, speaker_label, text, start_ms, end_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    segment_id,
                    session_id,
                    payload.sequence_number,
                    payload.speaker_label,
                    payload.text,
                    payload.start_ms,
                    payload.end_ms,
                ),
            )
        except Exception as exc:
            if "UNIQUE constraint failed" in str(exc):
                raise HTTPException(
                    status_code=409,
                    detail="This sequence number already exists for the session",
                ) from exc
            raise

    return TranscriptSegmentResponse(
        id=segment_id,
        session_id=session_id,
        sequence_number=payload.sequence_number,
        speaker_label=payload.speaker_label,
        text=payload.text,
        start_ms=payload.start_ms,
        end_ms=payload.end_ms,
    )


@router.get(
    "/{session_id}/segments",
    response_model=list[TranscriptSegmentResponse],
)
def list_segments(
    session_id: str,
    owner_id: str = Query(min_length=1, max_length=128),
):
    with get_connection() as connection:
        session = connection.execute(
            "SELECT id FROM meeting_sessions WHERE id = ? AND owner_id = ?",
            (session_id, owner_id),
        ).fetchone()

        if session is None:
            raise HTTPException(status_code=404, detail="Meeting session not found")

        rows = connection.execute(
            """
            SELECT id, session_id, sequence_number, speaker_label, text, start_ms, end_ms
            FROM transcript_segments
            WHERE session_id = ?
            ORDER BY sequence_number ASC
            """,
            (session_id,),
        ).fetchall()

    return [TranscriptSegmentResponse(**dict(row)) for row in rows]
