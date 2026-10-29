import type { HiggsfieldPromptRequest } from './higgsfield-draft';

export async function requestHiggsfieldPrompt(input: HiggsfieldPromptRequest, requestToken: string, signal?: AbortSignal): Promise<{ prompt: string }> {
  try {
    const response = await fetch('/api/codex/higgsfield-prompt', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-codex-request-token': requestToken,
      },
      body: JSON.stringify(input),
      signal,
    });
    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = isRecord(body) && typeof body.message === 'string' ? body.message : 'Codex 힉스필드 프롬프트 요청에 실패했습니다.';
      throw new Error(message);
    }
    if (!isRecord(body) || Object.keys(body).length !== 1 || typeof body.prompt !== 'string' || !body.prompt.trim()) {
      throw new Error('Codex 힉스필드 프롬프트 응답 형식이 올바르지 않습니다.');
    }
    return { prompt: body.prompt.trim() };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (error instanceof TypeError) throw new Error('Codex 로컬 서버에 연결할 수 없습니다.');
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
