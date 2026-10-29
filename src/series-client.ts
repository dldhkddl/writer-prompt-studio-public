import type { SeriesProposal } from './types';
import type { SeriesProposalRequest } from './series-draft';

const STORY_FIELDS = ['id', 'title', 'category', 'comedyMode', 'idea', 'logline', 'theme', 'outerGoal', 'innerNeed', 'flaw', 'obstacle', 'stakes', 'twist', 'ending', 'nextHook', 'whyNow'] as const;
const FUN_FIELDS = ['setup', 'escalation', 'reversal', 'visualGag', 'payoff', 'funReason'] as const;
const BEAT_KINDS = new Set(['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next']);

export async function requestSeriesProposals(input: SeriesProposalRequest, requestToken: string, signal?: AbortSignal): Promise<{ proposals: SeriesProposal[] }> {
  try {
    const response = await fetch('/api/codex/series-proposals', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'x-codex-request-token': requestToken },
      body: JSON.stringify(input),
      signal,
    });
    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = isRecord(body) && typeof body.message === 'string' ? body.message : 'Codex 연재 제안 요청에 실패했습니다.';
      throw new Error(message);
    }
    if (!isRecord(body) || Object.keys(body).length !== 1 || !Array.isArray(body.proposals) || body.proposals.length !== 3 || !body.proposals.every(isSeriesProposal)) {
      throw new Error('Codex 연재 제안 응답 형식이 올바르지 않습니다.');
    }
    return { proposals: body.proposals };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (error instanceof TypeError) throw new Error('Codex 로컬 서버에 연결할 수 없습니다.');
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSeriesProposal(value: unknown): value is SeriesProposal {
  if (!isRecord(value) || !STORY_FIELDS.every((field) => typeof value[field] === 'string' && value[field].trim())) return false;
  if (value.comedyMode !== 'relatable' && value.comedyMode !== 'meme') return false;
  if (!isStringArray(value.stateChanges) || !isStringArray(value.openThreads) || !isStringArray(value.resolvedThreads) || !isStringArray(value.characterIds) || !isStringArray(value.trendIds)) return false;
  const fun = value.fun;
  if (!isRecord(fun) || !FUN_FIELDS.every((field) => typeof fun[field] === 'string' && (fun[field] as string).trim())) return false;
  if (!Array.isArray(value.beats) || value.beats.length !== 7) return false;
  const kinds = new Set<string>();
  for (const beat of value.beats) {
    if (!isRecord(beat) || typeof beat.kind !== 'string' || !BEAT_KINDS.has(beat.kind) || typeof beat.content !== 'string' || !beat.content.trim() || typeof beat.continuityOut !== 'string' || !beat.continuityOut.trim()) return false;
    kinds.add(beat.kind);
  }
  return kinds.size === 7;
}
