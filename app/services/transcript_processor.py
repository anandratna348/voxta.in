
from app.services.interview_agent import InterviewAgent
from app.services.question_detector import detect_question
from app.services.speaker_detector import detect_speaker_intent


class TranscriptProcessor:
    def __init__(self):
        self.agent = InterviewAgent()

    def process_segment(
        self,
        user_id: str,
        text: str,
        context: str = "",
    ) -> dict:
        if not text or not text.strip():
            return {
                "question_detected": False,
                "answer": None,
                "reason": "Empty transcript segment",
            }

        intent = detect_speaker_intent(text)

        if intent == "candidate":
            return {
                "question_detected": False,
                "answer": None,
                "reason": "Likely candidate speech",
            }

        if intent == "unknown" and not detect_question(text):
            return {
                "question_detected": False,
                "answer": None,
                "reason": "No likely interviewer question detected",
            }

        return self.agent.process_transcript(
            user_id=user_id,
            transcript_text=text,
            context=context,
        )
