// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CharacterAppearancePanel from './CharacterAppearancePanel';
import type { Character } from './types';

const mocks = vi.hoisted(() => ({
  requestAppearanceSuggestion: vi.fn(),
  createAppearanceAnalysisCopy: vi.fn(),
  saveCharacterImage: vi.fn(),
}));

vi.mock('./appearance-client', () => ({ requestAppearanceSuggestion: mocks.requestAppearanceSuggestion }));
vi.mock('./appearance-image', () => ({ createAppearanceAnalysisCopy: mocks.createAppearanceAnalysisCopy }));
vi.mock('./image-store', () => ({ saveCharacterImage: mocks.saveCharacterImage }));

const character: Character = {
  id: 'c1',
  name: '밤톨',
  type: 'animal',
  appearance: '기존 외형',
  personality: '느긋함',
  voice: '짧게 말함',
  habits: '고개를 갸웃함',
  likes: '산책',
  dislikes: '목욕',
};

let root: Root | undefined;

function renderPanel(currentCharacter = character) {
  const container = document.createElement('div');
  document.body.append(container);
  const onUpdate = vi.fn();
  root = createRoot(container);
  act(() => root?.render(<CharacterAppearancePanel character={currentCharacter} onUpdate={onUpdate} />));
  return { container, onUpdate };
}

function button(container: HTMLElement, label: string) {
  const match = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(label));
  if (!match) throw new Error(`${label} 버튼을 찾지 못했습니다.`);
  return match as HTMLButtonElement;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.requestAppearanceSuggestion.mockReset();
  mocks.createAppearanceAnalysisCopy.mockReset().mockImplementation(async (value) => value);
  mocks.saveCharacterImage.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('캐릭터 외형 제안 패널', () => {
  it('제안은 적용 버튼을 누른 뒤에만 캐릭터 외형으로 전달한다', async () => {
    mocks.requestAppearanceSuggestion.mockResolvedValue({ appearance: '새 외형 제안' });
    const { container, onUpdate } = renderPanel();

    await act(async () => {
      button(container, '사진 없이 외형 만들기').click();
      await Promise.resolve();
    });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(container.querySelector('.appearance-proposal-card')?.textContent).toContain('새 외형 제안');

    act(() => button(container, '적용').click());
    expect(onUpdate).toHaveBeenCalledWith({ appearance: '새 외형 제안' });
  });

  it('사진 분석 요청에는 캐릭터 ID와 유형만 전송한다', async () => {
    mocks.requestAppearanceSuggestion.mockResolvedValue({ appearance: '사진 외형' });
    const { container } = renderPanel({ ...character, imageDataUrl: 'data:image/png;base64,AQID' });

    await act(async () => {
      button(container, '외형 다시 분석').click();
      await Promise.resolve();
    });

    expect(mocks.requestAppearanceSuggestion).toHaveBeenCalledWith({
      character: { id: 'c1', type: 'animal' },
      imageDataUrl: 'data:image/png;base64,AQID',
    }, expect.any(AbortSignal));
  });

  it('새 사진을 선택하는 즉시 진행 중인 이전 분석을 취소한다', async () => {
    let firstSignal: AbortSignal | undefined;
    mocks.requestAppearanceSuggestion.mockImplementation((_input, signal) => {
      firstSignal = signal;
      return new Promise(() => {});
    });
    class PendingFileReader {
      result: string | ArrayBuffer | null = null;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      readAsDataURL() {}
    }
    vi.stubGlobal('FileReader', PendingFileReader);
    const { container } = renderPanel();

    await act(async () => {
      button(container, '사진 없이 외형 만들기').click();
      await Promise.resolve();
    });
    expect(firstSignal?.aborted).toBe(false);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['photo'], '새사진.png', { type: 'image/png' })] });
    act(() => input.dispatchEvent(new Event('change', { bubbles: true })));

    expect(firstSignal?.aborted).toBe(true);
  });
});
