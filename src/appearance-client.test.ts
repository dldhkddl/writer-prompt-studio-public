import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestAppearanceSuggestion } from './appearance-client';

afterEach(() => vi.unstubAllGlobals());

const input = {
  character: {
    id: 'c1', name: '밤톨', type: 'animal' as const, personality: '느긋함', habits: '', likes: '산책', dislikes: '목욕',
  },
};

describe('외형 제안 로컬 클라이언트', () => {
  it('현재 로컬 세션 키를 얻어 외형 제안 요청과 중단 신호를 보낸다', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        available: true, authenticated: true, message: 'Codex 연결됨', requestToken: 'local-token',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ appearance: '크림색 곱슬 털' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAppearanceSuggestion(input, controller.signal)).resolves.toEqual({ appearance: '크림색 곱슬 털' });
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/codex/status', expect.objectContaining({
      signal: controller.signal,
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/codex/appearance-suggestion', expect.objectContaining({
      method: 'POST',
      signal: controller.signal,
      headers: expect.objectContaining({ 'x-codex-request-token': 'local-token' }),
    }));
  });

  it('로그인되지 않은 상태에서는 외형 요청을 보내지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      available: true, authenticated: false, message: 'Codex 로그인이 필요합니다.', requestToken: 'local-token',
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAppearanceSuggestion(input)).rejects.toThrow('Codex 로그인이 필요합니다.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('추가 필드나 빈 외형이 포함된 응답을 거부한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        available: true, authenticated: true, message: 'Codex 연결됨', requestToken: 'local-token',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ appearance: '', extra: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAppearanceSuggestion(input)).rejects.toThrow('외형 제안 응답 형식');
  });

  it('네트워크 연결 실패는 한국어 오류로 안내한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(requestAppearanceSuggestion(input)).rejects.toThrow('Codex 로컬 서버에 연결할 수 없습니다.');
  });
});
