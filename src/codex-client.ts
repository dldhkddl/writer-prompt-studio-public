import { codexStoryFields } from './codex-draft';
import type { CodexStoryDraft, CodexStoryRequest } from './codex-draft';

export type CodexStatus = { available: boolean; authenticated: boolean; message: string; requestToken: string };
export type CodexDraftResponse = { threadId: string; draft: CodexStoryDraft; editorNotes: string[] };
const allowedBeatKinds = new Set(['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next']);

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.message === 'string' ? body.message : 'Codex 연결 요청에 실패했습니다.');
  return body as T;
}

export async function getCodexStatus(signal?: AbortSignal): Promise<CodexStatus> {
  const body = await readResponse<unknown>(await fetch('/api/codex/status', { headers: { accept: 'application/json' }, signal }));
  if (!isRecord(body) || typeof body.available !== 'boolean' || typeof body.authenticated !== 'boolean' || typeof body.message !== 'string' || typeof body.requestToken !== 'string') {
    throw new Error('Codex 응답 형식이 올바르지 않습니다.');
  }
  return body as CodexStatus;
}

export async function requestStoryDraft(input: CodexStoryRequest, requestToken: string, signal?: AbortSignal): Promise<CodexDraftResponse> {
  const body = await readResponse<unknown>(await fetch('/api/codex/story-draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'x-codex-request-token': requestToken },
    body: JSON.stringify(input),
    signal,
  }));
  if (!isRecord(body) || typeof body.threadId !== 'string' || !isStoryDraft(body.draft) || !isStringArray(body.editorNotes)) {
    throw new Error('Codex 응답 형식이 올바르지 않습니다.');
  }
  return body as CodexDraftResponse;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isStoryDraft(value: unknown): value is CodexStoryDraft {
  if (!isRecord(value) || !codexStoryFields.every((field) => typeof value[field] === 'string' && value[field].trim()) || !isStringArray(value.editorNotes)) return false;
  if (!Array.isArray(value.beats) || value.beats.length !== allowedBeatKinds.size) return false;
  const kinds = new Set<string>();
  for (const beat of value.beats) {
    if (!isRecord(beat) || typeof beat.kind !== 'string' || !allowedBeatKinds.has(beat.kind) || typeof beat.content !== 'string' || !beat.content.trim()) return false;
    kinds.add(beat.kind);
  }
  return kinds.size === allowedBeatKinds.size;
}
