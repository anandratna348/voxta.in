
from unittest.mock import MagicMock, patch

import pytest

from app.services.transcription_service import TranscriptionService


def test_transcribe_file_returns_timestamped_segments(tmp_path):
    audio_file = tmp_path / "sample.wav"
    audio_file.write_bytes(b"fake audio")

    fake_model = MagicMock()
    fake_model.transcribe.return_value = (
        [
            MagicMock(
                start=0.0,
                end=1.25,
                text=" Hello there. ",
            ),
            MagicMock(
                start=1.3,
                end=2.5,
                text=" How are you? ",
            ),
        ],
        None,
    )

    with patch(
        "app.services.transcription_service.WhisperModel",
        return_value=fake_model,
    ):
        service = TranscriptionService()
        result = service.transcribe_file(str(audio_file))

    assert len(result) == 2
    assert result[0] == {
        "start": 0.0,
        "end": 1.25,
        "text": "Hello there.",
    }
    assert result[1]["text"] == "How are you?"
    fake_model.transcribe.assert_called_once()


def test_missing_audio_file_raises_error():
    with patch("app.services.transcription_service.WhisperModel"):
        service = TranscriptionService()

    with pytest.raises(FileNotFoundError):
        service.transcribe_file("missing_sample.wav")
