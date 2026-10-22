
from unittest.mock import patch

import pytest

from app.services.gemini_service import GeminiServiceError
from app.services.interview_agent import InterviewAgent


def test_interviewer_question_gets_answer():
    agent = InterviewAgent()

    with patch(
        "app.services.interview_agent.generate_answer",
        return_value="A REST API lets clients interact with a server.",
    ) as mock_generate:
        result = agent.process_transcript(
            user_id="test-user",
            transcript_text="What is a REST API?",
            context="",
        )

    assert result["question_detected"] is True
    assert result["answer"] == (
        "A REST API lets clients interact with a server."
    )
    assert result["reason"] is None
    mock_generate.assert_called_once()


def test_non_question_is_ignored():
    agent = InterviewAgent()

    with patch(
        "app.services.interview_agent.generate_answer"
    ) as mock_generate:
        result = agent.process_transcript(
            user_id="test-user",
            transcript_text="The meeting starts at ten.",
        )

    assert result["question_detected"] is False
    mock_generate.assert_not_called()


def test_duplicate_question_is_not_generated_twice():
    agent = InterviewAgent()

    with patch(
        "app.services.interview_agent.generate_answer",
        return_value="A REST API exposes resources.",
    ) as mock_generate:
        agent.process_transcript(
            user_id="test-user",
            transcript_text="What is a REST API?",
        )
        result = agent.process_transcript(
            user_id="test-user",
            transcript_text="What is a REST API?",
        )

    assert result["reason"] == "Question already processed"
    assert mock_generate.call_count == 1


def test_failed_generation_can_be_retried():
    agent = InterviewAgent()

    with patch(
        "app.services.interview_agent.generate_answer",
        side_effect=[
            GeminiServiceError("Temporary failure"),
            "A REST API exposes resources.",
        ],
    ) as mock_generate:
        with pytest.raises(GeminiServiceError):
            agent.process_transcript(
                user_id="test-user",    
                transcript_text="What is a REST API?",
            )

        result = agent.process_transcript(
            user_id="test-user",
            transcript_text="What is a REST API?",
        )

    assert result["answer"] == "A REST API exposes resources."
    assert mock_generate.call_count == 2
