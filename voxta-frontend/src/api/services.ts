import { config } from "./config";
import { request, requestBlob } from "./http";
import type {
  AiAnswer,
  GoogleLoginStart,
  HealthResponse,
  MeetingSession,
  ProcessResult,
  SavedSegmentsResult,
  SessionStatus,
  SessionStatusResult,
  TranscriptSegment,
  User,
} from "./types";

/**
 * The only module screens should import to talk to the backend.
 * Every function maps to a route that exists in the FastAPI project.
 */

export const healthApi = {
  check: (signal?: AbortSignal) =>
    request<HealthResponse>("", { absoluteUrl: config.healthUrl, signal, timeoutMs: 5000 }),
};

export const authApi = {
  /** Starts the system-browser Google flow. The backend finishes sign-in on its own callback port. */
  startGoogleLogin: () => request<GoogleLoginStart>("/auth/google/start"),
  /** Exchanges a Google ID token for a Voxta user. */
  loginWithIdToken: (idToken: string) =>
    request<User>("/auth/google", { method: "POST", json: { id_token: idToken } }),
};

export const sessionsApi = {
  list: (ownerId: string, limit = 50, signal?: AbortSignal) =>
    request<MeetingSession[]>("/sessions", { query: { owner_id: ownerId, limit }, signal }),

  get: (ownerId: string, sessionId: string, signal?: AbortSignal) =>
    request<MeetingSession>(`/sessions/${sessionId}`, { query: { owner_id: ownerId }, signal }),

  create: (ownerId: string, title: string) =>
    request<MeetingSession>("/sessions", { method: "POST", json: { owner_id: ownerId, title } }),

  updateStatus: (ownerId: string, sessionId: string, status: SessionStatus) =>
    request<SessionStatusResult>(`/sessions/${sessionId}/status`, {
      method: "PATCH",
      query: { owner_id: ownerId },
      json: { status },
      timeoutMs: config.longRequestTimeoutMs,
    }),
};

export const transcriptsApi = {
  listSegments: (ownerId: string, sessionId: string, signal?: AbortSignal) =>
    request<TranscriptSegment[]>(`/sessions/${sessionId}/segments`, {
      query: { owner_id: ownerId },
      signal,
    }),

  listAnswers: async (ownerId: string, sessionId: string, signal?: AbortSignal) => {
    const data = await request<{ answers: AiAnswer[] }>(`/sessions/${sessionId}/answers`, {
      query: { owner_id: ownerId },
      signal,
    });
    return data.answers;
  },

  /** Runs question detection and answer generation on the whole saved transcript. */
  process: (ownerId: string, sessionId: string, context = "") =>
    request<ProcessResult>(`/sessions/${sessionId}/process`, {
      method: "POST",
      query: { owner_id: ownerId, context },
      timeoutMs: config.longRequestTimeoutMs,
    }),

  exportPdf: (ownerId: string, sessionId: string) =>
    requestBlob(`/sessions/${sessionId}/export/pdf`, {
      query: { owner_id: ownerId },
      timeoutMs: config.longRequestTimeoutMs,
    }),
};

export const transcriptionApi = {
  /** Transcribes one audio file and saves the resulting segments to the session. */
  transcribeIntoSession: (ownerId: string, sessionId: string, audio: Blob, filename: string) => {
    const form = new FormData();
    form.append("owner_id", ownerId);
    form.append("file", audio, filename);
    return request<SavedSegmentsResult>(`/transcription/sessions/${sessionId}/transcribe`, {
      method: "POST",
      form,
      timeoutMs: config.longRequestTimeoutMs,
    });
  },
};