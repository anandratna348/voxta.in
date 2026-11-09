/**
 * Local, per-computer storage for copilot results. Only answers and settings are kept here.
 * No API keys or tokens are ever stored by the frontend.
 */
export const NO_QUESTION_TOKEN = "[NO_INTERVIEWER_QUESTION]";
export const CONTEXT_LIMIT = 6000;

export const isNoQuestion = (answer: string) => answer.includes(NO_QUESTION_TOKEN);

export interface StoredAnswer {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  /** "app" answers live on this computer. "backend" answers are saved in the meeting history. */
  source: "app" | "backend";
  segmentId?: string;
}

export interface ScanEntry {
  state: "question" | "none";
  reason?: string | null;
  answerId?: string;
}

export interface CopilotStore {
  answers: StoredAnswer[];
  scans: Record<string, ScanEntry>;
}

const storeKey = (sessionId: string) => `voxta.copilot.${sessionId}`;

export function loadStore(sessionId: string): CopilotStore {
  try {
    const raw = localStorage.getItem(storeKey(sessionId));
    const parsed = raw ? (JSON.parse(raw) as Partial<CopilotStore>) : {};
    return { answers: parsed.answers ?? [], scans: parsed.scans ?? {} };
  } catch {
    return { answers: [], scans: {} };
  }
}

export function saveStore(sessionId: string, store: CopilotStore): void {
  try {
    localStorage.setItem(storeKey(sessionId), JSON.stringify(store));
  } catch {
    /* storage unavailable, results stay in memory for this visit */
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export const loadContext = () => (read("voxta.copilot.context") ?? "").slice(0, CONTEXT_LIMIT);
export const saveContext = (value: string) => write("voxta.copilot.context", value.slice(0, CONTEXT_LIMIT));
/** Auto detect is on unless the person switched it off. */
export const loadAuto = () => read("voxta.copilot.auto") !== "0";
export const saveAuto = (on: boolean) => write("voxta.copilot.auto", on ? "1" : "0");

/** SQLite stores CURRENT_TIMESTAMP as UTC without a zone marker. */
export function parseBackendTime(value: string): string {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
}