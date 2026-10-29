import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestSeriesProposals } from './series-client';

afterEach(() => vi.unstubAllGlobals());

const input = { series: { premise: '면접 준비', protagonistId: 'c1', comedyModes: ['relatable'] }, characters: [], relationships: [], history: [], trends: [] } as never;
const proposal = {
  id: 'p1', title: '면접 전날', category: '일상', comedyMode: 'relatable', idea: '아이디어', logline: '로그라인', theme: '주제', outerGoal: '목표', innerNeed: '필요', flaw: '약점', obstacle: '장애물', stakes: '대가', twist: '반전', ending: '결말', nextHook: '다음 훅', whyNow: '지금 필요한 이유',
  stateChanges: ['변화'], openThreads: ['복선'], resolvedThreads: [], characterIds: ['c1'], trendIds: [],
  fun: { setup: '상황', escalation: '상승', reversal: '반전', visualGag: '시각 행동', payoff: '보상', funReason: '캐릭터 고유성' },
  beats: ['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next'].map((kind) => ({ kind, content: `${kind} 행동`, continuityOut: `${kind} 마지막 상태` })),
};

describe('연재 제안 로컬 클라이언트', () => {
  it('현재 로컬 세션 키와 취소 신호로 다음 화 제안을 요청한다', async () => {
    const controller = new AbortController();
    const proposals = [proposal, { ...proposal, id: 'p2', title: '면접 당일' }, { ...proposal, id: 'p3', title: '합격 연락' }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ proposals }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestSeriesProposals(input, 'local-token', controller.signal)).resolves.toEqual({ proposals });
    expect(fetchMock).toHaveBeenCalledWith('/api/codex/series-proposals', expect.objectContaining({
      method: 'POST', signal: controller.signal, headers: expect.objectContaining({ 'x-codex-request-token': 'local-token' }),
    }));
  });

  it('후보가 3개가 아니거나 필수 구조가 비어 있으면 거부한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ proposals: [proposal] }), { status: 200 })));
    await expect(requestSeriesProposals(input, 'local-token')).rejects.toThrow('연재 제안 응답 형식');
  });
});
