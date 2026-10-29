// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HiggsfieldPromptPanel from './HiggsfieldPromptPanel';
import type { Episode, Project, Scene } from './types';

const mocks = vi.hoisted(() => ({
  getCodexStatus: vi.fn(),
  requestHiggsfieldPrompt: vi.fn(),
}));
vi.mock('./codex-client', () => ({ getCodexStatus: mocks.getCodexStatus }));
vi.mock('./higgsfield-client', () => ({ requestHiggsfieldPrompt: mocks.requestHiggsfieldPrompt }));

const scene: Scene = { id: 's1', title: '첫 업무', action: '서류를 흩뜨린다', dialogue: '직원: “옮겨 주세요.” / 줄리아: “네!”', camera: '줌인', mood: '코미디', negativePrompt: '왜곡 금지', characterIds: ['c1'] };
const episode: Episode = { id: 'e1', title: '첫 출근', idea: '첫 업무', worldId: 'w1', characterIds: ['c1'], scenes: [scene], status: 'draft', updatedAt: '2026-08-28' };
const project: Project = {
  characters: [{ id: 'c1', name: '줄리아', type: 'animal', appearance: '검은색 시바견', personality: '성실함', voice: '해맑음', habits: '꼬리를 흔든다', likes: '칭찬', dislikes: '혼나는 것' }],
  worlds: [{ id: 'w1', name: '일상 도시', tone: '현실 코미디', setting: '한국 사무실', rules: ['사람과 강아지는 자연스럽게 대화한다'] }],
  relationships: [], episodes: [episode], trends: [],
};

let root: Root | undefined;
function renderPanel(currentScene = scene, currentEpisode: Episode = { ...episode, scenes: [currentScene] }) {
  const container = document.createElement('div');
  document.body.append(container);
  const onUpdateScene = vi.fn();
  root = createRoot(container);
  act(() => root?.render(<HiggsfieldPromptPanel project={project} episode={currentEpisode} scene={currentScene} onUpdateScene={onUpdateScene} />));
  return { container, onUpdateScene };
}
function button(container: HTMLElement, label: string) {
  const match = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(label));
  if (!match) throw new Error(`${label} 버튼을 찾지 못했습니다.`);
  return match as HTMLButtonElement;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.getCodexStatus.mockReset().mockResolvedValue({ available: true, authenticated: true, message: '연결됨', requestToken: 'token' });
  mocks.requestHiggsfieldPrompt.mockReset().mockResolvedValue({ prompt: 'Sol이 만든 구체적인 실행 프롬프트' });
});
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('힉스필드 프롬프트 제안 패널', () => {
  it('Sol 제안은 미리보기만 하고 적용 버튼을 누른 뒤 장면에 저장한다', async () => {
    const { container, onUpdateScene } = renderPanel();

    await act(async () => {
      button(container, 'Sol로 구체화').click();
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Sol이 만든 구체적인 실행 프롬프트');
    expect(onUpdateScene).not.toHaveBeenCalled();

    act(() => button(container, '제안 적용').click());
    expect(onUpdateScene).toHaveBeenCalledWith(expect.objectContaining({
      higgsfieldPrompt: 'Sol이 만든 구체적인 실행 프롬프트',
      higgsfieldPromptSourceKey: expect.stringMatching(/^hf-v2-/),
    }));
  });

  it('저장한 제안의 기준 설정이 달라지면 이전 제안을 사용하지 않고 다시 제안을 안내한다', () => {
    const { container } = renderPanel({ ...scene, action: '새 행동', higgsfieldPrompt: '이전 제안', higgsfieldPromptSourceKey: 'hf-old' });

    expect(container.textContent).toContain('설정이 바뀌어 다시 제안이 필요해요');
    expect(container.querySelector('pre')?.textContent).not.toContain('이전 제안');
    expect(container.querySelector('pre')?.textContent).toContain('새 행동');
  });

  it('장면에 처음 들어가면 700ms 뒤 Sol 제안을 한 번만 자동 요청한다', async () => {
    vi.useFakeTimers();
    const { container } = renderPanel();

    await act(async () => {
      vi.advanceTimersByTime(699);
      await Promise.resolve();
    });
    expect(mocks.requestHiggsfieldPrompt).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mocks.requestHiggsfieldPrompt).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('SOL 제안');

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(mocks.requestHiggsfieldPrompt).toHaveBeenCalledTimes(1);
  });

  it('앞 장면의 마지막 상태를 다음 장면 로컬 프롬프트에 연결한다', () => {
    const previous: Scene = { ...scene, id: 's0', title: '앞 장면', action: '서류를 들고 복도 끝에 멈춘다', continuityOut: '복도 끝에서 서류를 든 채 오른쪽을 본다' };
    const current: Scene = { ...scene, id: 's2', title: '다음 장면', continuityIn: '복도 끝에서 서류를 든 채 오른쪽을 본다' };
    const connectedEpisode = { ...episode, scenes: [previous, current] };
    const { container } = renderPanel(current, connectedEpisode);

    expect(container.querySelector('.prompt-panel > pre')?.textContent).toContain('이전 클립의 마지막 프레임');
    expect(container.querySelector('.prompt-panel > pre')?.textContent).toContain('복도 끝에서 서류를 든 채 오른쪽을 본다');
  });

  it('Sol 제안에도 승인된 장면 참고 이미지 규칙을 빠뜨리지 않는다', async () => {
    const referenceScene: Scene = {
      ...scene,
      referenceAssets: [{ id: 'a1', keyword: '면접 부스', category: 'environment', reason: '공간 기준', imagePrompt: '현실적인 온라인 면접 부스', priority: 'required', status: 'approved' }],
    };
    const { container } = renderPanel(referenceScene);

    await act(async () => {
      button(container, 'Sol로 구체화').click();
      await Promise.resolve();
    });

    const proposalText = container.querySelector('.prompt-proposal p')?.textContent ?? '';
    expect(proposalText).toContain('Sol이 만든 구체적인 실행 프롬프트');
    expect(proposalText).toContain('승인된 참고 이미지만');
    expect(proposalText).toContain('면접 부스');
  });
});
