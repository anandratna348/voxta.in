
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.db.database import get_connection

router = APIRouter(prefix="/sessions", tags=["Meetings"])


class SessionCreate(BaseModel):
    owner_id: str = Field(min_length=1, max_length=128)
    title: str = Field(min_length=1, max_length=200)


class SessionResponse(BaseModel):
    id: str
    owner_id: str
    title: str
    status: str
    started_at: str
    ended_at: str | None


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate):
    session_id = str(uuid4())
    started_at = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO meeting_sessions (id, owner_id, title, status, started_at)
            VALUES (?, ?, ?, 'active', ?)
            """,
            (session_id, payload.owner_id, payload.title, started_at),
        )

    return SessionResponse(
        id=session_id,
        owner_id=payload.owner_id,
        title=payload.title,
        status="active",
        started_at=started_at,
        ended_at=None,
    )


@router.get("", response_model=list[SessionResponse])
def list_sessions(
    owner_id: str = Query(min_length=1, max_length=128),
    limit: int = Query(default=50, ge=1, le=100),
):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, owner_id, title, status, started_at, ended_at
            FROM meeting_sessions
            WHERE owner_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (owner_id, limit),
        ).fetchall()

    return [SessionResponse(**dict(row)) for row in rows]


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: str,
    owner_id: str = Query(min_length=1, max_length=128),
):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, owner_id, title, status, started_at, ended_at
            FROM meeting_sessions
            WHERE id = ? AND owner_id = ?
            """,
            (session_id, owner_id),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Meeting session not found")

    return SessionResponse(**dict(row))
