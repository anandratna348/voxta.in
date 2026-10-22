
from pathlib import Path

from faster_whisper import WhisperModel


class TranscriptionService:
    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
    ):
        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )

    def transcribe_file(self, audio_path: str) -> list[dict]:
        path = Path(audio_path)

        if not path.is_file():
            raise FileNotFoundError("Audio file not found.")

        segments, _ = self.model.transcribe(
            str(path),
            vad_filter=False,
        )

        results = []

        for segment in segments:
            text = segment.text.strip()

            if not text:
                continue

            results.append({
                "start": round(segment.start, 3),
                "end": round(segment.end, 3),
                "text": text,
            })

        return results
