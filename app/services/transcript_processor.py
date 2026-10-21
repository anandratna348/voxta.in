
from app.services.interview_agent import InterviewAgent


class TranscriptProcessor:
    """Pass finalized transcript segments to the interview agent."""

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

        return self.agent.process_transcript(
            user_id=user_id,
            transcript_text=text,
            context=context,
        )
