import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestReferenceAssetSuggestions } from './reference-assets-client';

afterEach(() => vi.unstubAllGlobals());

describe('장면 필요 이미지 클라이언트', () => {
  it('로컬 Codex API에 요청하고 검증된 항목을 반환한다', async () => {
    const assets = [
      { keyword: '면접 부스', category: 'environment', reason: '공간 기준', imagePrompt: '현실적인 면접 부스', priority: 'required' },
      { keyword: '노트북', category: 'prop', reason: '핵심 소품', imagePrompt: '은색 노트북', priority: 'required' },
      { keyword: '입장 화면', category: 'screen', reason: '행동 기준', imagePrompt: '화상 면접 화면', priority: 'optional' },
    ];
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ assets }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestReferenceAssetSuggestions({ episode: { id: 'e1', title: '첫 면접' }, scene: { id: 's1', title: '면접', action: '노트북을 누른다' }, characters: [] }, 'token')).resolves.toEqual({ assets });
    expect(fetchMock).toHaveBeenCalledWith('/api/codex/reference-assets', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'x-codex-request-token': 'token' }) }));
  });

  it('항목 수나 분류가 잘못된 응답을 거부한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ assets: [{ keyword: 'x' }] }), { status: 200 })));
    await expect(requestReferenceAssetSuggestions({ episode: {}, scene: {}, characters: [] }, 'token')).rejects.toThrow('응답 형식');
  });
});
