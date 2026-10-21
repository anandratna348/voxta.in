
from unittest.mock import patch

from app.services.interview_agent import InterviewAgent


def test_ignores_ordinary_transcript():
    agent = InterviewAgent()

    result = agent.process_transcript(
        user_id="test-user",
        transcript_text="I worked on a Python project yesterday.",
    )

    assert result["question_detected"] is False
    assert result["answer"] is None


def test_generates_answer_for_question():
    agent = InterviewAgent()

    with patch(
        "app.services.interview_agent.generate_answer",
        return_value="I built a REST API using FastAPI.",
    ) as mock_generate:
        result = agent.process_transcript(
            user_id="test-user",
            transcript_text="Tell me about your backend project.",
        )

    assert result["question_detected"] is True
    assert result["answer"] == "I built a REST API using FastAPI."
    mock_generate.assert_called_once()


def test_duplicate_question_does_not_generate_twice():
    agent = InterviewAgent()

    with patch(
        "app.services.interview_agent.generate_answer",
        return_value="I use Python.",
    ) as mock_generate:
        first = agent.process_transcript(
            user_id="test-user",
            transcript_text="What is Python?",
        )
        second = agent.process_transcript(
            user_id="test-user",
            transcript_text="What is Python?",
        )

    assert first["answer"] == "I use Python."
    assert second["answer"] is None
    assert second["reason"] == "Question already processed"
    mock_generate.assert_called_once()
