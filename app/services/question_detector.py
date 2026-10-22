
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
    cleaned = re.sub(r"\s+", " ", text).strip().lower()

    if not cleaned:
        return False

    # Direct questions ending with a question mark.
    if "?" in cleaned:
        return True

    # Questions or prompts that begin with common interview phrases.
    if any(cleaned.startswith(starter) for starter in QUESTION_STARTERS):
        return True

    # Detect interview questions embedded in longer transcript text.
    for starter in QUESTION_STARTERS:
        pattern = rf"(?:^|[.!]\s+){re.escape(starter)}\b"
        if re.search(pattern, cleaned):
            return True

    return False
