/**
 * Session persistence for guided tools.
 *
 * Answers live in sessionStorage for the current browser tab only. They are
 * cleared when the tab closes, after SESSION_TTL_MS without activity, or when
 * the visitor starts over. Nothing here is sent to a server.
 */

import type { Answers, ToolId } from './types.ts';

export const SESSION_KEY = 'vigilon.guided.v1';
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export interface ToolProgress {
  /** Questions the visitor opened in this tool (answers reused from other tools are skipped). */
  visited: string[];
  completedAt?: number;
}

export interface GuidedSession {
  version: 1;
  updatedAt: number;
  answers: Answers;
  tools: Partial<Record<ToolId, ToolProgress>>;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function emptySession(now = Date.now()): GuidedSession {
  return { version: 1, updatedAt: now, answers: {}, tools: {} };
}

function sanitizeAnswers(value: unknown): Answers {
  if (!value || typeof value !== 'object') return {};
  const answers: Answers = {};
  for (const [key, answer] of Object.entries(value)) {
    if (typeof answer === 'string') answers[key] = answer;
    else if (Array.isArray(answer) && answer.every((item) => typeof item === 'string')) answers[key] = answer;
  }
  return answers;
}

function sanitizeTools(value: unknown): GuidedSession['tools'] {
  if (!value || typeof value !== 'object') return {};
  const tools: GuidedSession['tools'] = {};
  for (const [key, progress] of Object.entries(value)) {
    if (!progress || typeof progress !== 'object') continue;
    const { visited, completedAt } = progress as Partial<ToolProgress>;
    tools[key as ToolId] = {
      visited: Array.isArray(visited) ? visited.filter((item) => typeof item === 'string') : [],
      ...(typeof completedAt === 'number' ? { completedAt } : {}),
    };
  }
  return tools;
}

export function loadSession(store: KeyValueStore | null, now = Date.now()): GuidedSession {
  if (!store) return emptySession(now);
  try {
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return emptySession(now);
    const parsed = JSON.parse(raw) as Partial<GuidedSession>;
    if (parsed.version !== 1 || typeof parsed.updatedAt !== 'number' || now - parsed.updatedAt > SESSION_TTL_MS) {
      store.removeItem(SESSION_KEY);
      return emptySession(now);
    }
    return {
      version: 1,
      updatedAt: parsed.updatedAt,
      answers: sanitizeAnswers(parsed.answers),
      tools: sanitizeTools(parsed.tools),
    };
  } catch {
    return emptySession(now);
  }
}

/** Returns false when storage is unavailable, so the UI can say progress won’t survive a refresh. */
export function saveSession(store: KeyValueStore | null, session: GuidedSession, now = Date.now()): boolean {
  if (!store) return false;
  try {
    store.setItem(SESSION_KEY, JSON.stringify({ ...session, updatedAt: now }));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(store: KeyValueStore | null): void {
  try {
    store?.removeItem(SESSION_KEY);
  } catch {
    // Storage may be blocked; there is nothing further to clear.
  }
}
