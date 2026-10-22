
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)


def generate_meeting_pdf(
    session: dict,
    segments: list[dict],
    answers: list[dict],
) -> bytes:
    """Generate a PDF containing a meeting transcript and AI answers."""
    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Voxta Meeting Report - {session.get('title', 'Meeting')}",
        author="Voxta",
    )

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="ReportTitle",
            parent=styles["Title"],
            alignment=TA_CENTER,
            textColor=colors.HexColor("#334155"),
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading2"],
            textColor=colors.HexColor("#334155"),
            spaceBefore=14,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TranscriptText",
            parent=styles["BodyText"],
            leading=14,
            spaceAfter=6,
            wordWrap="CJK",
        )
    )

    story = [
        Paragraph("Voxta Meeting Report", styles["ReportTitle"]),
        Paragraph(
            escape(str(session.get("title") or "Untitled Meeting")),
            styles["Heading2"],
        ),
        Paragraph(
            f"Session ID: {escape(str(session.get('id', '')))}",
            styles["Normal"],
        ),
        Paragraph(
            f"Started: {escape(str(session.get('started_at', 'Unknown')))}",
            styles["Normal"],
        ),
        Spacer(1, 10),
    ]

    story.append(Paragraph("Meeting Transcript", styles["SectionHeading"]))

    if segments:
        for segment in segments:
            start = segment.get("start_ms", 0) / 1000
            end = segment.get("end_ms", 0) / 1000
            speaker = escape(str(segment.get("speaker_label") or "Speaker"))
            text = escape(str(segment.get("text", "")))

            story.append(
                Paragraph(
                    f"<b>[{start:.2f}s - {end:.2f}s] {speaker}:</b> {text}",
                    styles["TranscriptText"],
                )
            )
    else:
        story.append(Paragraph("No transcript segments saved.", styles["Normal"]))

    story.append(Paragraph("AI-Generated Answers", styles["SectionHeading"]))

    if answers:
        for index, answer in enumerate(answers, start=1):
            question = escape(str(answer.get("question_text", "")))
            answer_text = escape(str(answer.get("answer_text", "")))
            created_at = escape(str(answer.get("created_at", "")))

            block = [
                Paragraph(f"<b>Question {index}</b>", styles["Heading3"]),
                Paragraph(f"<b>Question:</b> {question}", styles["TranscriptText"]),
                Paragraph(f"<b>Suggested answer:</b> {answer_text}", styles["TranscriptText"]),
            ]

            if created_at:
                block.append(
                    Paragraph(
                        f"<font size='8'>Generated: {created_at}</font>",
                        styles["Normal"],
                    )
                )

            block.append(Spacer(1, 8))
            story.append(KeepTogether(block))
    else:
        story.append(
            Paragraph("No AI-generated answers saved.", styles["Normal"])
        )

    document.build(story)
    return buffer.getvalue()
