
from unittest.mock import patch

from app.services.transcript_processor import TranscriptProcessor


def test_empty_segment_is_ignored():
    processor = TranscriptProcessor()

    result = processor.process_segment(
        user_id="test-user",
        text="   ",
    )

    assert result["question_detected"] is False
    assert result["answer"] is None


def test_question_segment_reaches_agent():
    processor = TranscriptProcessor()

    with patch.object(
        processor.agent,
        "process_transcript",
        return_value={
            "question_detected": True,
            "answer": "I use Python for backend development.",
            "reason": None,
        },
    ) as mock_agent:
        result = processor.process_segment(
            user_id="test-user",
            text="What programming language do you use?",
        )

    assert result["question_detected"] is True
    assert result["answer"] == "I use Python for backend development."
    mock_agent.assert_called_once()
