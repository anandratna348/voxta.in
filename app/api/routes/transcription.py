
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi import Form
from uuid import uuid4

from app.db.database import get_connection

from app.services.transcription_service import TranscriptionService

router = APIRouter(prefix="/transcription", tags=["Transcription"])

MAX_AUDIO_SIZE = 25 * 1024 * 1024
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".mp4", ".webm", ".ogg"}

_service = None


def get_transcription_service() -> TranscriptionService:
    global _service
    if _service is None:
        _service = TranscriptionService()
    return _service


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio file extension.",
        )

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_path = Path(temp_file.name)
            size = 0

            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_AUDIO_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Audio file exceeds the 25 MB limit.",
                    )
                temp_file.write(chunk)

        service = get_transcription_service()
        segments = service.transcribe_file(str(temp_path))

        return {"segments": segments}

    except HTTPException:
        raise
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    
    except Exception as exc:
        import logging

        logging.getLogger(__name__).exception(
            "Audio transcription failed"
        )

        raise HTTPException(
            status_code=500,
            detail="Audio transcription failed. Check the backend terminal.",
        ) from exc

    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
        await file.close()



@router.post("/sessions/{session_id}/transcribe")
async def transcribe_into_session(
    session_id: str,
    owner_id: str = Form(...),
    file: UploadFile = File(...),
):
    suffix = Path(file.filename or "").suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio file extension.",
        )

    with get_connection() as connection:
        session = connection.execute(
            """
            SELECT id FROM meeting_sessions
            WHERE id = ? AND owner_id = ?
            """,
            (session_id, owner_id),
        ).fetchone()

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Meeting session not found.",
        )

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_path = Path(temp_file.name)
            size = 0

            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_AUDIO_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Audio file exceeds the 25 MB limit.",
                    )
                temp_file.write(chunk)

        segments = get_transcription_service().transcribe_file(
            str(temp_path)
        )

        saved_segments = []

        with get_connection() as connection:
            next_row = connection.execute(
                """
                SELECT COALESCE(MAX(sequence_number), -1) + 1 AS next_sequence
                FROM transcript_segments
                WHERE session_id = ?
                """,
                (session_id,),
            ).fetchone()

            sequence = next_row["next_sequence"]

            for segment in segments:
                text = segment["text"].strip()
                if not text:
                    continue

                start_ms = max(0, round(segment["start"] * 1000))
                end_ms = max(start_ms, round(segment["end"] * 1000))
                segment_id = str(uuid4())

                connection.execute(
                    """
                    INSERT INTO transcript_segments (
                        id, session_id, sequence_number,
                        speaker_label, text, start_ms, end_ms
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        segment_id,
                        session_id,
                        sequence,
                        None,
                        text,
                        start_ms,
                        end_ms,
                    ),
                )

                saved_segments.append(
                    {
                        "id": segment_id,
                        "sequence_number": sequence,
                        "start_ms": start_ms,
                        "end_ms": end_ms,
                        "text": text,
                    }
                )
                sequence += 1

        return {
            "session_id": session_id,
            "saved_count": len(saved_segments),
            "segments": saved_segments,
        }

    except HTTPException:
        raise
    except Exception as exc:
        import logging

        logging.getLogger(__name__).exception(
            "Session audio transcription failed"
        )
        raise HTTPException(
            status_code=500,
            detail="Transcription or transcript saving failed. Check the backend terminal.",
        ) from exc
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
        await file.close()

