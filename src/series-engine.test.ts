import { describe, expect, it } from 'vitest';
import { approveSeriesProposal } from './series-engine';
import type { Project, SeriesProposal } from './types';

const proposal: SeriesProposal = {
  id: '후보-1',
  title: '첫 회식의 위기',
  category: '회사',
  comedyMode: 'relatable',
  idea: '줄리아가 첫 회식에서 주문 담당을 맡는다',
  logline: '메뉴 이름을 모르는 줄리아가 모두의 주문을 지키려 애쓴다',
  theme: '모르는 것을 물어보는 용기',
  outerGoal: '회식 주문을 끝낸다',
  innerNeed: '도움을 요청한다',
  flaw: '모르는 것도 아는 척한다',
  obstacle: '끝없이 바뀌는 주문',
  stakes: '첫 회식 분위기를 망친다',
  twist: '사실 모두 메뉴 이름을 몰랐다',
  ending: '줄리아가 사진 메뉴판을 제안한다',
  nextHook: '다음 날 단체 채팅방에 사진이 올라온다',
  whyNow: '첫 출근 뒤 동료 관계가 시작되는 시점이다',
  stateChanges: ['동료들과 처음으로 사적인 시간을 보냈다'],
  openThreads: ['회식 사진의 행방'],
  resolvedThreads: [],
  characterIds: ['c1'],
  trendIds: [],
  fun: {
    setup: '주문 담당이 된 줄리아', escalation: '주문이 세 번 바뀐다', reversal: '모두 메뉴를 몰랐다',
    visualGag: '메모지가 주문 수정선으로 새까매진다', payoff: '사진 메뉴판 한 장으로 정리한다', funReason: '성실하지만 눈치가 느린 줄리아의 약점이 직접 문제를 만든다',
  },
  beats: ['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next'].map((kind, index) => ({
    kind: kind as SeriesProposal['beats'][number]['kind'],
    content: `${index + 1}번째 행동`,
    continuityOut: `${index + 1}번째 마지막 자세`,
  })),
};

const project: Project = {
  characters: [{ id: 'c1', name: '줄리아', type: 'animal', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' }],
  worlds: [], relationships: [], trends: [], episodes: [],
  seriesPlan: {
    premise: '오늘 면접 준비를 시작한 줄리아', protagonistId: 'c1', status: 'planning', comedyModes: ['relatable', 'meme'],
    pendingProposals: [proposal], createdAt: '2026-08-28T00:00:00.000Z', updatedAt: '2026-08-28T00:00:00.000Z',
  },
};

describe('연재 후보 승인', () => {
  it('원본은 바꾸지 않고 승인한 후보 하나를 7개의 연속된 8초 장면으로 만든다', () => {
    const before = structuredClone(project);
    const result = approveSeriesProposal(project, '후보-1', '2026-08-28T01:00:00.000Z');
    const episode = result.project.episodes[0];

    expect(project).toEqual(before);
    expect(episode.title).toBe('첫 회식의 위기');
    expect(episode.scenes).toHaveLength(7);
    expect(episode.scenes.every((scene) => scene.timeRange === '8초')).toBe(true);
    expect(episode.scenes[1].continuityIn).toBe('1번째 마지막 자세');
    expect(episode.seriesMeta).toEqual(expect.objectContaining({ sequence: 1, category: '회사', sourceProposalId: '후보-1' }));
    expect(result.project.seriesPlan).toEqual(expect.objectContaining({ status: 'running', pendingProposals: [] }));
    expect(result.episodeId).toBe(episode.id);
    expect(result.sceneId).toBe(episode.scenes[0].id);
  });

  it('존재하지 않는 후보는 승인하지 않는다', () => {
    expect(() => approveSeriesProposal(project, '없는-후보', '2026-08-28T01:00:00.000Z')).toThrow('후보');
  });

  it('삭제된 캐릭터나 출처 없는 트렌드를 참조하는 후보는 승인하지 않는다', () => {
    const missingCharacter = { ...project, characters: [] };
    expect(() => approveSeriesProposal(missingCharacter, '후보-1', '2026-08-28T01:00:00.000Z')).toThrow('캐릭터');

    const missingWorld = { ...project, seriesPlan: { ...project.seriesPlan!, worldId: '삭제된-세계관' } };
    expect(() => approveSeriesProposal(missingWorld, '후보-1', '2026-08-28T01:00:00.000Z')).toThrow('세계관');

    const unverifiedTrend = {
      ...project,
      trends: [{ id: 't1', title: '유행', sourceUrl: '', checkedAt: '', platform: 'Instagram', note: '' }],
      seriesPlan: { ...project.seriesPlan!, pendingProposals: [{ ...proposal, trendIds: ['t1'] }] },
    };
    expect(() => approveSeriesProposal(unverifiedTrend, '후보-1', '2026-08-28T01:00:00.000Z')).toThrow('트렌드');
  });
});
