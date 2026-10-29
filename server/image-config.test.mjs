import { describe, expect, it, vi } from 'vitest';
import { resolveOpenAIImageApiKey } from './image-config.mjs';

describe('로컬 이미지 API 키 설정', () => {
  it('운영체제 환경 변수의 키를 가장 먼저 사용한다', () => {
    const loadEnv = vi.fn(() => ({ OPENAI_API_KEY: 'file-key' }));

    expect(resolveOpenAIImageApiKey({ mode: 'development', projectRoot: 'C:/studio', processEnv: { OPENAI_API_KEY: ' system-key ' }, loadEnv })).toBe('system-key');
    expect(loadEnv).not.toHaveBeenCalled();
  });

  it('환경 변수가 없으면 프로젝트의 비공개 env 파일에서 키를 읽는다', () => {
    const loadEnv = vi.fn(() => ({ OPENAI_API_KEY: ' local-key ' }));

    expect(resolveOpenAIImageApiKey({ mode: 'development', projectRoot: 'C:/studio', processEnv: {}, loadEnv })).toBe('local-key');
    expect(loadEnv).toHaveBeenCalledWith('development', 'C:/studio', '');
  });
});
