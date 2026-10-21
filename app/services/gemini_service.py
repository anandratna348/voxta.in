
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

    
    prompt = f"""You are Voxta, a real-time interview copilot.

Task: Identify the interviewer's question in the supplied transcript
and produce a concise, accurate answer the candidate can speak naturally.

Rules:
- Answer genuine interviewer questions directly. Use general knowledge
  for technical and conceptual questions; don't limit answers to context.
- For personal-experience questions, use the candidate context. Never
  invent skills, projects, achievements, or qualifications.
- Be logical, confident, professional, and conversational.
- Prefer 2-5 sentences unless the question requires more detail.
- For "step by step", give clear numbered steps.
- For "one step at a time", give only the first step.
- For code or examples, follow the interviewer's requested format.
- Use first person for candidate answers when appropriate.
- If the transcript is clearly the candidate speaking, or contains no
  interviewer question, return exactly [NO_INTERVIEWER_QUESTION].
- If speaker identity is ambiguous, use the conversation's meaning;
  do not invent a question or personal facts.
- Output only the suggested spoken answer, without analysis or labels.

Candidate context:
{context[:6000]}

Transcript:
{question[:4000]}
"""


    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
          
        )

        answer = response.text
        if not answer or not answer.strip():
            raise GeminiServiceError("Gemini returned an empty response.")

        return answer.strip()

    except GeminiServiceError:
        raise
    except Exception as exc:
        raise GeminiServiceError(
            "Gemini request failed. Check the API key, network, quota, and model access."
        ) from exc
