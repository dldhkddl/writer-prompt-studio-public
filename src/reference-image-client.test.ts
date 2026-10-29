import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestReferenceImage } from './reference-image-client';

afterEach(() => vi.unstubAllGlobals());

describe('GPT 참고 이미지 클라이언트', () => {
  it('카드 정보를 로컬 이미지 API로 보내고 PNG를 반환한다', async () => {
    const payload = { imageDataUrl: 'data:image/png;base64,QUJDRA==', mimeType: 'image/png', model: 'gpt-image-2' };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestReferenceImage({ assetId: 'a1', keyword: '노트북', category: 'prop', imagePrompt: '은색 노트북', sceneTitle: '면접' }, 'token')).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith('/api/images/generate', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'x-codex-request-token': 'token' }) }));
  });

  it('데이터 URL이 아닌 응답을 거부한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ imageDataUrl: 'https://example.com/a.png', mimeType: 'image/png', model: 'gpt-image-2' }), { status: 200 })));
    await expect(requestReferenceImage({ assetId: 'a1', keyword: '노트북', category: 'prop', imagePrompt: '은색 노트북', sceneTitle: '면접' }, 'token')).rejects.toThrow('응답 형식');
  });
});
