
from app.services.question_detector import detect_question


def test_detects_question_mark():
    assert detect_question("What is Python?") is True


def test_detects_interview_question_without_question_mark():
    assert detect_question("Tell me about your latest project") is True


def test_ignores_ordinary_statement():
    assert detect_question("I worked on a backend project yesterday.") is False


def test_ignores_empty_text():
    assert detect_question("   ") is False


def test_detects_behavioral_question():
    assert detect_question("Describe a difficult problem you solved") is True
