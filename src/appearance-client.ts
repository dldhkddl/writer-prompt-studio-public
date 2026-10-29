import type { Character } from './types';
import { getCodexStatus } from './codex-client';

type CharacterConceptInput = Pick<Character, 'id' | 'name' | 'type' | 'personality' | 'habits' | 'likes' | 'dislikes'>;
type PhotoAppearanceInput = Pick<Character, 'id' | 'type'>;

export type AppearanceSuggestionInput =
  | { character: PhotoAppearanceInput; imageDataUrl: string }
  | { character: CharacterConceptInput; imageDataUrl?: undefined };

export async function requestAppearanceSuggestion(
  input: AppearanceSuggestionInput,
  signal?: AbortSignal,
): Promise<{ appearance: string }> {
  try {
    const status = await getCodexStatus(signal);
    if (!status.available || !status.authenticated) throw new Error(status.message);
    const response = await fetch('/api/codex/appearance-suggestion', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-codex-request-token': status.requestToken,
      },
      body: JSON.stringify(input),
      signal,
    });
    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = isRecord(body) && typeof body.message === 'string'
        ? body.message
        : 'Codex 외형 제안 요청에 실패했습니다.';
      throw new Error(message);
    }
    if (!isRecord(body) || Object.keys(body).length !== 1 || typeof body.appearance !== 'string' || !body.appearance.trim()) {
      throw new Error('Codex 외형 제안 응답 형식이 올바르지 않습니다.');
    }
    return { appearance: body.appearance.trim() };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (error instanceof TypeError) throw new Error('Codex 로컬 서버에 연결할 수 없습니다.');
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
