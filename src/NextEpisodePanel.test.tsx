// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NextEpisodePanel from './NextEpisodePanel';
import type { Episode, Project, SeriesProposal } from './types';

const mocks = vi.hoisted(() => ({ getCodexStatus: vi.fn(), requestSeriesProposals: vi.fn() }));
vi.mock('./codex-client', () => ({ getCodexStatus: mocks.getCodexStatus }));
vi.mock('./series-client', () => ({ requestSeriesProposals: mocks.requestSeriesProposals }));

const beatKinds = ['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next'] as const;
const makeProposal = (id: string, title: string, category: string): SeriesProposal => ({
  id, title, category, comedyMode: 'relatable', idea: `${title} 아이디어`, logline: `${title} 로그라인`, theme: '성장', outerGoal: '다음 업무를 끝낸다', innerNeed: '도움을 요청한다', flaw: '혼자 해결하려 한다', obstacle: '예상 밖의 업무', stakes: '마감을 놓친다', twist: '동료도 같은 문제를 겪었다', ending: '함께 해결한다', nextHook: '새 알림이 온다', whyNow: '현재 화의 결과가 바로 이어진다',
  stateChanges: ['업무에 익숙해진다'], openThreads: ['새 알림'], resolvedThreads: ['첫 검수'], characterIds: ['c1'], trendIds: [],
  fun: { setup: '새 업무', escalation: '실수 확대', reversal: '동료도 실수', visualGag: '메모가 길어진다', payoff: '함께 해결', funReason: '성실함이 문제를 키운다' },
  beats: beatKinds.map((kind) => ({ kind, content: `${kind} 행동`, continuityOut: `${kind} 마지막 상태` })),
});
const proposals = [
  makeProposal('p1', '바로 다음 업무', '후속'),
  makeProposal('p2', '동료와 첫 점심', '관계'),
  makeProposal('p3', '사라진 파일의 반전', '변화'),
];
const episode: Episode = {
  id: 'e1', title: 'AI 검수 첫날', idea: '줄리아가 사라진 사과를 찾는다', characterIds: ['c1'], status: 'draft', updatedAt: '',
  logline: '줄리아가 검수 오류를 찾아 첫 업무를 통과한다', ending: '오류를 제출한다', nextHook: '팀장이 다음 영상을 건넨다',
  beats: [{ id: 'b1', kind: 'hook', label: '훅', timeRange: '8초', purpose: '발견', content: '사과가 사라진다', continuityOut: '화면을 가리킨다' }],
  scenes: [{ id: 's1', title: '오류 발견', action: '사라진 사과를 가리킨다', dialogue: '사과가 사라졌어요.', camera: '', mood: '', negativePrompt: '' }],
};
const project: Project = {
  characters: [{ id: 'c1', name: '줄리아', type: 'animal', appearance: '검은 시바견', personality: '성실함', voice: '밝음', habits: '', likes: '', dislikes: '' }],
  worlds: [], relationships: [], trends: [], episodes: [episode],
};

let root: Root | undefined;
const renderPanel = () => {
  const container = document.createElement('div');
  document.body.append(container);
  const onUpdatePlan = vi.fn();
  const onApproveProposal = vi.fn();
  root = createRoot(container);
  act(() => root?.render(<NextEpisodePanel project={project} episode={episode} onUpdatePlan={onUpdatePlan} onApproveProposal={onApproveProposal} />));
  return { container, onUpdatePlan, onApproveProposal };
};
const findButton = (container: HTMLElement, text: string) => [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(text)) as HTMLButtonElement | undefined;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.getCodexStatus.mockReset().mockResolvedValue({ available: true, authenticated: true, message: '연결됨', requestToken: 'token' });
  mocks.requestSeriesProposals.mockReset().mockResolvedValue({ proposals });
});
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('시나리오 설계의 다음 편 추천', () => {
  it('현재 시나리오를 읽어 세 갈래를 제안하고 선택한 후보만 승인한다', async () => {
    const { container, onUpdatePlan, onApproveProposal } = renderPanel();

    await act(async () => {
      findButton(container, '다음 편 추천받기')?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.requestSeriesProposals).toHaveBeenCalledWith(expect.objectContaining({
      sourceEpisode: expect.objectContaining({ id: 'e1', ending: '오류를 제출한다', nextHook: '팀장이 다음 영상을 건넨다', beats: expect.any(Array), scenes: expect.any(Array) }),
    }), 'token', expect.any(AbortSignal));
    expect(onUpdatePlan).toHaveBeenCalledWith(expect.objectContaining({ sourceEpisodeId: 'e1', pendingProposals: proposals }));
    expect(container.textContent).toContain('바로 이어가기');
    expect(container.textContent).toContain('관계 넓히기');
    expect(container.textContent).toContain('뜻밖의 변화');
    expect(container.querySelectorAll('.next-episode-card')).toHaveLength(3);

    act(() => (container.querySelector('button[aria-label="동료와 첫 점심 선택"]') as HTMLButtonElement).click());
    expect(onApproveProposal).toHaveBeenCalledWith('p2');
  });
});
