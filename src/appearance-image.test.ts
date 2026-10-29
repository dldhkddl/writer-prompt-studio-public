import { describe, expect, it, vi } from 'vitest';
import {
  calculateContainSize,
  createAppearanceAnalysisCopy,
  dataUrlByteLength,
  type AppearanceImageProcessor,
} from './appearance-image';

describe('외형 분석용 이미지 복사본', () => {
  it('긴 변을 1280px 안에 맞추면서 비율을 유지한다', () => {
    expect(calculateContainSize(2400, 1600, 1280)).toEqual({ width: 1280, height: 853 });
    expect(calculateContainSize(600, 800, 1280)).toEqual({ width: 600, height: 800 });
  });

  it('Base64 데이터 URL의 실제 바이트 수를 계산한다', () => {
    expect(dataUrlByteLength('data:image/png;base64,AA==')).toBe(1);
    expect(dataUrlByteLength('data:image/png;base64,AQID')).toBe(3);
  });

  it('이미 기준을 만족하는 원본은 다시 인코딩하지 않는다', async () => {
    const encode = vi.fn();
    const processor: AppearanceImageProcessor = {
      load: async () => ({ width: 600, height: 400, source: {} }),
      encode,
    };
    const original = 'data:image/png;base64,AQID';

    await expect(createAppearanceAnalysisCopy(original, processor)).resolves.toBe(original);
    expect(encode).not.toHaveBeenCalled();
  });

  it('큰 이미지는 1280px WebP 분석본으로 축소한다', async () => {
    const calls: Array<{ width: number; height: number; mimeType: string; quality: number }> = [];
    const processor: AppearanceImageProcessor = {
      load: async () => ({ width: 2400, height: 1600, source: {} }),
      encode: async (_source, width, height, mimeType, quality) => {
        calls.push({ width, height, mimeType, quality });
        return 'data:image/webp;base64,AA==';
      },
    };

    await expect(createAppearanceAnalysisCopy('data:image/jpeg;base64,AQID', processor)).resolves.toBe('data:image/webp;base64,AA==');
    expect(calls[0]).toEqual({ width: 1280, height: 853, mimeType: 'image/webp', quality: 0.9 });
  });
});
