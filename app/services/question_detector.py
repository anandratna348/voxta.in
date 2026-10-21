
import re


QUESTION_STARTERS = (
    "what",
    "why",
    "how",
    "when",
    "where",
    "who",
    "which",
    "can you",
    "could you",
    "would you",
    "tell me",
    "describe",
    "explain",
    "have you",
    "do you",
    "are you",
    "walk me through",
)


def detect_question(text: str) -> bool:
    """Identify transcript segments that may contain interview questions."""
    cleaned = re.sub(r"\s+", " ", text).strip().lower()

    if not cleaned:
        return False

    if "?" in cleaned:
        return True

    return any(cleaned.startswith(starter) for starter in QUESTION_STARTERS)
