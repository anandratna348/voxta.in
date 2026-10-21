
from google import genai

from app.services.gemini_credentials import get_api_key


class GeminiServiceError(Exception):
    """Raised when Gemini cannot generate a response."""


def generate_answer(
    user_id: str,
    question: str,
    context: str = "",
) -> str:
    api_key = get_api_key(user_id)

    if not api_key:
        raise GeminiServiceError(
            "Gemini API key is not configured for this user."
        )

    question = question.strip()
    if not question:
        raise ValueError("Question cannot be empty")

    prompt = f"""
You are Voxta, an AI assistant for meeting and interview support.

Use the supplied context to answer the question.
Do not invent personal experience, qualifications, or facts.
If the context does not contain enough information, say so.
Keep the answer concise and natural to speak aloud.

Context:
{context[:12000]}

Question:
{question}
"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        answer = response.text
        if not answer:
            raise GeminiServiceError("Gemini returned an empty response.")

        return answer.strip()

    except GeminiServiceError:
        raise
    except Exception as exc:
        raise GeminiServiceError(
            "Gemini request failed. Check the API key, network, quota, and model access."
        ) from exc
