
import hashlib
import threading

from app.services.gemini_service import (
    GeminiServiceError,
    generate_answer,
)
from app.services.question_detector import detect_question


class InterviewAgent:
    def __init__(self):
        self._processed_questions = set()
        self._lock = threading.Lock()

    def process_transcript(
        self,
        user_id: str,
        transcript_text: str,
        context: str = "",
    ) -> dict:
        text = transcript_text.strip()

        if not text or not detect_question(text):
            return {
                "question_detected": False,
                "answer": None,
                "reason": "No likely question detected",
            }

        normalized = " ".join(text.lower().split())
        question_hash = hashlib.sha256(
            f"{user_id}:{normalized}".encode("utf-8")
        ).hexdigest()

        with self._lock:
            if question_hash in self._processed_questions:
                return {
                    "question_detected": True,
                    "answer": None,
                    "reason": "Question already processed",
                }

            self._processed_questions.add(question_hash)

        try:
            answer = generate_answer(
                user_id=user_id,
                question=text,
                context=context,
            )
        except Exception:
            # Permit retry if generation fails for any reason.
            with self._lock:
                self._processed_questions.discard(question_hash)
            raise

        return {
            "question_detected": True,
            "answer": answer,
            "reason": None,
        }
