// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SeriesRoom from './SeriesRoom';
import type { Project, SeriesProposal } from './types';

const mocks = vi.hoisted(() => ({ getCodexStatus: vi.fn(), requestSeriesProposals: vi.fn() }));
vi.mock('./codex-client', () => ({ getCodexStatus: mocks.getCodexStatus }));
vi.mock('./series-client', () => ({ requestSeriesProposals: mocks.requestSeriesProposals }));

const beatKinds = ['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next'] as const;
const proposal: SeriesProposal = {
  id: 'p1', title: '첫 회식 주문 전쟁', category: '회식', comedyMode: 'relatable', idea: '주문 담당이 된다',
  logline: '줄리아가 계속 바뀌는 주문을 지킨다', theme: '도움 요청', outerGoal: '주문 완료', innerNeed: '물어보기',
  flaw: '아는 척', obstacle: '바뀌는 메뉴', stakes: '분위기를 망친다', twist: '모두 메뉴를 모른다', ending: '사진 메뉴판으로 해결',
  nextHook: '단체방 사진', whyNow: '첫 출근 뒤 동료 관계가 시작된다', stateChanges: ['동료와 가까워진다'],
  openThreads: ['회식 사진'], resolvedThreads: ['첫 출근'], characterIds: ['c1'], trendIds: ['t1'],
  fun: { setup: '주문 담당', escalation: '세 번 변경', reversal: '모두 모름', visualGag: '새까만 주문표', payoff: '사진 한 장', funReason: '줄리아의 성실함이 문제를 키운다' },
  beats: beatKinds.map((kind) => ({ kind, content: `${kind} 행동`, continuityOut: `${kind} 마지막 상태` })),
};
const project: Project = {
  characters: [{ id: 'c1', name: '줄리아', type: 'animal', appearance: '검은 시바견', personality: '성실함', voice: '해맑음', habits: '꼬리를 흔든다', likes: '칭찬', dislikes: '혼나는 것' }],
  worlds: [{ id: 'w1', name: '일상 도시', tone: '현실 코미디', setting: '회사', rules: ['자연스럽게 대화한다'] }],
  relationships: [], trends: [{ id: 't1', title: '직장 공감 근거', sourceUrl: 'https://example.com/source', checkedAt: '2026-08-28', platform: 'Instagram', note: '근거' }], episodes: [],
  seriesPlan: { premise: '오늘 면접 준비를 시작한 줄리아', protagonistId: 'c1', worldId: 'w1', status: 'planning', comedyModes: ['relatable'], pendingProposals: [], createdAt: '2026-08-28', updatedAt: '2026-08-28' },
};

let root: Root | undefined;
function renderRoom(currentProject = project) {
  const container = document.createElement('div');
  document.body.append(container);
  const onUpdatePlan = vi.fn();
  const onApproveProposal = vi.fn();
  root = createRoot(container);
  act(() => root?.render(<SeriesRoom project={currentProject} onUpdatePlan={onUpdatePlan} onApproveProposal={onApproveProposal} />));
  return { container, onUpdatePlan, onApproveProposal };
}
function button(container: HTMLElement, label: string) {
  const match = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(label));
  if (!match) throw new Error(`${label} 버튼을 찾지 못했습니다.`);
  return match as HTMLButtonElement;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.getCodexStatus.mockReset().mockResolvedValue({ available: true, authenticated: true, message: '연결됨', requestToken: 'token' });
  mocks.requestSeriesProposals.mockReset().mockResolvedValue({ proposals: [proposal, { ...proposal, id: 'p2', title: '첫 월급', category: '월급', comedyMode: 'meme' }, { ...proposal, id: 'p3', title: '첫 주말', category: '주말' }] });
});
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('연재 자동 작가 화면', () => {
  it('현실 공감과 밈·과장을 독립적으로 함께 선택할 수 있다', () => {
    const { container, onUpdatePlan } = renderRoom();
    const meme = [...container.querySelectorAll('input[type="checkbox"]')].find((input) => (input as HTMLInputElement).value === 'meme') as HTMLInputElement;

    act(() => meme.click());

    expect(onUpdatePlan).toHaveBeenCalledWith(expect.objectContaining({ comedyModes: ['relatable', 'meme'] }));
  });

  it('연재 시작을 누르면 Sol 제안 3개를 저장하되 에피소드는 만들지 않는다', async () => {
    const { container, onUpdatePlan, onApproveProposal } = renderRoom();

    await act(async () => {
      button(container, '연재 시작').click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.requestSeriesProposals).toHaveBeenCalledWith(expect.objectContaining({ series: expect.objectContaining({ premise: project.seriesPlan?.premise }) }), 'token', expect.any(AbortSignal));
    expect(onUpdatePlan).toHaveBeenCalledWith(expect.objectContaining({ pendingProposals: expect.arrayContaining([proposal]) }));
    expect(onApproveProposal).not.toHaveBeenCalled();
  });

  it('후보 카드의 확정 버튼을 눌러야만 승인 콜백을 호출한다', () => {
    const readyProject = { ...project, seriesPlan: { ...project.seriesPlan!, pendingProposals: [proposal] } };
    const { container, onApproveProposal } = renderRoom(readyProject);

    expect(onApproveProposal).not.toHaveBeenCalled();
    act(() => button(container, '이번 화로 확정').click());
    expect(onApproveProposal).toHaveBeenCalledWith('p1');
    expect(container.querySelector('a[href="https://example.com/source"]')?.textContent).toContain('직장 공감 근거');
  });

  it('주인공·세계관·재미 설정을 바꾸면 이전 조건으로 만든 후보를 폐기한다', () => {
    const readyProject = { ...project, seriesPlan: { ...project.seriesPlan!, pendingProposals: [proposal] } };
    const { container, onUpdatePlan } = renderRoom(readyProject);

    act(() => {
      const meme = [...container.querySelectorAll('input[type="checkbox"]')].find((input) => (input as HTMLInputElement).value === 'meme') as HTMLInputElement;
      meme.click();
    });

    expect(onUpdatePlan).toHaveBeenCalledWith(expect.objectContaining({ comedyModes: ['relatable', 'meme'], pendingProposals: [] }));
  });
});
