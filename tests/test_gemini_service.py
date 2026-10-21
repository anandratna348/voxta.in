
from unittest.mock import MagicMock, patch

import pytest

from app.services.gemini_service import (
    GeminiServiceError,
    generate_answer,
)


def test_missing_api_key():
    with patch(
        "app.services.gemini_service.get_api_key",
        return_value=None,
    ):
        with pytest.raises(
            GeminiServiceError,
            match="API key is not configured",
        ):
            generate_answer(
                user_id="test-user",
                question="Tell me about yourself",
            )


def test_empty_question_is_rejected():
    with patch(
        "app.services.gemini_service.get_api_key",
        return_value="test-api-key",
    ):
        with pytest.raises(ValueError, match="Question cannot be empty"):
            generate_answer(
                user_id="test-user",
                question="   ",
            )


def test_generate_answer_success():
    mock_response = MagicMock()
    mock_response.text = "I am a Python developer."

    with (
        patch(
            "app.services.gemini_service.get_api_key",
            return_value="test-api-key",
        ),
        patch(
            "app.services.gemini_service.genai.Client",
        ) as mock_client_class,
    ):
        mock_client = mock_client_class.return_value
        mock_client.models.generate_content.return_value = mock_response

        result = generate_answer(
            user_id="test-user",
            question="Tell me about yourself",
            context="I am a Python developer.",
        )

    assert result == "I am a Python developer."
    mock_client.models.generate_content.assert_called_once()


def test_gemini_failure_returns_safe_error():
    with (
        patch(
            "app.services.gemini_service.get_api_key",
            return_value="test-api-key",
        ),
        patch(
            "app.services.gemini_service.genai.Client",
            side_effect=RuntimeError("Sensitive internal details"),
        ),
    ):
        with pytest.raises(
            GeminiServiceError,
            match="Gemini request failed",
        ) as error:
            generate_answer(
                user_id="test-user",
                question="Explain Python",
            )

    assert "Sensitive internal details" not in str(error.value)
