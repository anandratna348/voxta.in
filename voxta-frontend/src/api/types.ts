/** Types mirror the FastAPI response models exactly. Do not add fields the backend does not return. */

export type SessionStatus = "active" | "paused" | "completed";

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture: string;
  created_at: string;
}

export interface MeetingSession {
  id: string;
  owner_id: string;
  title: string;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
}

export interface SessionStatusResult {
  session_id: string;
  status: SessionStatus;
  ended_at: string | null;
}

export interface TranscriptSegment {
  id: string;
  session_id: string;
  sequence_number: number;
  speaker_label: string | null;
  text: string;
  start_ms: number;
  end_ms: number;
}

export interface AiAnswer {
  id: string;
  session_id: string;
  question_text: string;
  answer_text: string;
  created_at: string;
}

export interface ProcessResult {
  question_detected: boolean;
  answer: string | null;
  reason: string | null;
}

export interface SavedSegmentsResult {
  session_id: string;
  saved_count: number;
  segments: Omit<TranscriptSegment, "session_id" | "speaker_label">[];
}

export interface GoogleLoginStart {
  authorization_url: string;
  state: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}