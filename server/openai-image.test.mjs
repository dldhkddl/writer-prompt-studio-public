import { describe, expect, it, vi } from 'vitest';
import { createOpenAIImageGenerator } from './openai-image.mjs';

describe('OpenAI 참고 이미지 생성기', () => {
  it('API 키가 없으면 외부 요청 없이 연결 안내를 반환한다', async () => {
    const fetchImpl = vi.fn();
    const generator = createOpenAIImageGenerator({ apiKey: '', fetchImpl });

    await expect(generator.generate({ prompt: '은색 노트북', size: '1024x1024' })).rejects.toMatchObject({ statusCode: 503 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('GPT Image 2로 생성하고 PNG 데이터 URL을 반환한다', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: [{ b64_json: 'QUJDRA==' }] }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const generator = createOpenAIImageGenerator({ apiKey: 'secret', fetchImpl });

    await expect(generator.generate({ prompt: '은색 노트북, 로고 없음', size: '1024x1024' })).resolves.toEqual({
      imageDataUrl: 'data:image/png;base64,QUJDRA==', mimeType: 'image/png', model: 'gpt-image-2',
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.openai.com/v1/images/generations', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ authorization: 'Bearer secret' }),
      body: JSON.stringify({ model: 'gpt-image-2', prompt: '은색 노트북, 로고 없음', size: '1024x1024', quality: 'medium', output_format: 'png' }),
    }));
  });

  it('API 오류 메시지나 깨진 이미지 응답을 안전한 오류로 바꾼다', async () => {
    const apiError = createOpenAIImageGenerator({ apiKey: 'secret', fetchImpl: vi.fn(async () => new Response(JSON.stringify({ error: { message: 'billing limit' } }), { status: 429 })) });
    await expect(apiError.generate({ prompt: '노트북', size: '1024x1024' })).rejects.toMatchObject({ statusCode: 429, message: 'OpenAI 이미지 생성 요청이 거부되었습니다: billing limit' });

    const malformed = createOpenAIImageGenerator({ apiKey: 'secret', fetchImpl: vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })) });
    await expect(malformed.generate({ prompt: '노트북', size: '1024x1024' })).rejects.toThrow('이미지 응답 형식');
  });
});
