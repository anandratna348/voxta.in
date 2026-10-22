
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

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
