
import re


INTERVIEWER_CUES = (
    "tell me about",
    "walk me through",
    "can you explain",
    "could you explain",
    "describe",
    "why do you",
    "how would you",
    "what is your",
    "what are your",
    "have you worked",
    "do you know",
    "write a function",
    "solve this",
)

CANDIDATE_CUES = (
    "my experience",
    "i have worked",
    "i worked on",
    "i built",
    "i developed",
    "my project",
    "i think",
    "in my opinion",
)


def detect_speaker_intent(text: str) -> str:
    """Estimate whether a transcript sounds like an interviewer question."""
    cleaned = re.sub(r"\s+", " ", text).strip().lower()

    if not cleaned:
        return "unknown"

    if any(cleaned.startswith(cue) for cue in CANDIDATE_CUES):
        return "candidate"

    if "?" in cleaned or any(
        cleaned.startswith(cue) for cue in INTERVIEWER_CUES
    ):
        return "interviewer"

    return "unknown"
