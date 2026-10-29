import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestHiggsfieldPrompt } from './higgsfield-client';

afterEach(() => vi.unstubAllGlobals());

const input = { episode: { id: 'e1', title: '첫 출근' }, scene: { id: 's1', title: '첫 업무', action: '서류를 흩뜨린다', dialogue: '', camera: '', mood: '', negativePrompt: '' }, characters: [], relationships: [] };

describe('힉스필드 프롬프트 로컬 클라이언트', () => {
  it('현재 로컬 세션 키와 취소 신호로 Sol 제안을 요청한다', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ prompt: '구체적인 실행 프롬프트' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestHiggsfieldPrompt(input, 'local-token', controller.signal)).resolves.toEqual({ prompt: '구체적인 실행 프롬프트' });
    expect(fetchMock).toHaveBeenCalledWith('/api/codex/higgsfield-prompt', expect.objectContaining({
      method: 'POST', signal: controller.signal,
      headers: expect.objectContaining({ 'x-codex-request-token': 'local-token' }),
    }));
  });

  it('빈 프롬프트나 추가 필드가 든 응답을 거부한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ prompt: '', extra: true }), { status: 200 })));
    await expect(requestHiggsfieldPrompt(input, 'local-token')).rejects.toThrow('힉스필드 프롬프트 응답 형식');
  });
});
