
from app.services.speaker_detector import detect_speaker_intent


def test_detect_interviewer_question():
    assert detect_speaker_intent(
        "Can you explain REST APIs?"
    ) == "interviewer"


def test_detect_candidate_statement():
    assert detect_speaker_intent(
        "I built an API using FastAPI."
    ) == "candidate"


def test_detect_unknown_statement():
    assert detect_speaker_intent(
        "FastAPI is a Python framework."
    ) == "unknown"


def test_empty_transcript():
    assert detect_speaker_intent("") == "unknown"
