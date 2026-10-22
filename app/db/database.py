
import sqlite3

from app.core.config import get_settings
from uuid import uuid4


def get_connection() -> sqlite3.Connection:
    settings = get_settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(
        settings.database_path,
        timeout=10,
    )
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 10000")

    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS meeting_sessions (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                title TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                started_at TEXT NOT NULL,
                sended_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

            CREATE TABLE IF NOT EXISTS transcript_segments (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                sequence_number INTEGER NOT NULL,
                speaker_label TEXT,
                text TEXT NOT NULL,
                start_ms INTEGER NOT NULL CHECK (start_ms >= 0),
                end_ms INTEGER NOT NULL CHECK (end_ms >= start_ms),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (session_id)
                    REFERENCES meeting_sessions(id)
                    ON DELETE CASCADE,

                UNIQUE (session_id, sequence_number)
            );

            CREATE INDEX IF NOT EXISTS idx_segments_session
                ON transcript_segments(session_id, sequence_number);



            
            CREATE TABLE IF NOT EXISTS ai_answers (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                question_text TEXT NOT NULL,
                answer_text TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (session_id)
                    REFERENCES meeting_sessions(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_ai_answers_session
                ON ai_answers(session_id, created_at);

            """
        )


def save_ai_answer(
    session_id: str,
    question_text: str,
    answer_text: str,
) -> dict:
    answer_id = str(uuid4())

    with get_connection() as connection:
        session = connection.execute(
            "SELECT id FROM meeting_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()

        if session is None:
            raise ValueError("Meeting session not found")

        connection.execute(
            """
            INSERT INTO ai_answers (
                id, session_id, question_text, answer_text
            )
            VALUES (?, ?, ?, ?)
            """,
            (answer_id, session_id, question_text, answer_text),
        )

        row = connection.execute(
            """
            SELECT id, session_id, question_text, answer_text, created_at
            FROM ai_answers
            WHERE id = ?
            """,
            (answer_id,),
        ).fetchone()

    return dict(row)

