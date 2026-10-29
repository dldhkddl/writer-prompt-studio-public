import { describe, expect, it } from 'vitest';
import { buildNextEpisodePlan, buildNextEpisodeProposalRequest, buildSeriesProposalRequest } from './series-draft';
import type { Episode, Project } from './types';

const history = Array.from({ length: 31 }, (_, index): Episode => ({
  id: `e${index + 1}`, title: `${index + 1}화`, idea: `${index + 1}화 아이디어`, characterIds: ['c1'], scenes: [], status: 'ready', updatedAt: '',
  logline: `${index + 1}화 로그라인`, ending: `${index + 1}화 결말`, nextHook: `${index + 1}화 다음 훅`,
  seriesMeta: {
    sequence: index + 1, category: '회사', comedyMode: 'relatable', whyNow: '이전 화의 결과',
    stateChanges: [`${index + 1}화 변화`], openThreads: [`${index + 1}화 복선`], resolvedThreads: [], sourceProposalId: `p${index + 1}`,
  },
}));

const project: Project = {
  characters: [
    { id: 'c1', name: '줄리아', type: 'animal', imageDataUrl: 'data:image/png;base64,private', appearance: '검은 시바견', personality: '성실함', voice: '해맑음', habits: '', likes: '', dislikes: '' },
    { id: 'c2', name: '민수', type: 'human', appearance: '단정한 직장인', personality: '차분함', voice: '낮음', habits: '', likes: '', dislikes: '' },
  ],
  worlds: [{ id: 'w1', name: '직장 일상', tone: '코미디', setting: '서울', rules: ['동물과 사람이 대화한다'] }],
  relationships: [{ id: 'r1', fromCharacterId: 'c1', toCharacterId: 'c2', kind: '동료', description: '아직 어색하다' }],
  trends: [
    { id: 't1', title: '출처 있음', sourceUrl: 'https://example.com/source', checkedAt: '2026-08-28', platform: 'Instagram', note: '직장 공감 소재' },
    { id: 't2', title: '출처 없음', sourceUrl: '', checkedAt: '', platform: 'Instagram', note: '사용하면 안 됨' },
  ],
  episodes: history,
  seriesPlan: { premise: '오늘 면접 준비를 시작한 줄리아', protagonistId: 'c1', worldId: 'w1', status: 'running', comedyModes: ['relatable', 'meme'], pendingProposals: [], createdAt: '', updatedAt: '' },
};

describe('연재 Sol 요청 만들기', () => {
  it('사진 원문과 출처 없는 트렌드를 빼고 최근 30화의 상태 변화와 복선을 보낸다', () => {
    const request = buildSeriesProposalRequest(project);
    const serialized = JSON.stringify(request);

    expect(serialized).not.toContain('data:image');
    expect(serialized).not.toContain('출처 없음');
    expect(request.characters[0]).toEqual(expect.objectContaining({ id: 'c1', hasReferenceImage: true }));
    expect(request.history).toHaveLength(30);
    expect(request.history[0].seriesMeta.sequence).toBe(2);
    expect(request.history[29].seriesMeta.openThreads).toEqual(['31화 복선']);
    expect(request.series).toEqual({ premise: '오늘 면접 준비를 시작한 줄리아', protagonistId: 'c1', worldId: 'w1', comedyModes: ['relatable', 'meme'] });
  });

  it('연재 설정이 없으면 요청을 만들지 않는다', () => {
    expect(() => buildSeriesProposalRequest({ ...project, seriesPlan: undefined })).toThrow('연재 설정');
  });

  it('다음 편 추천은 현재 시나리오의 전체 구조와 실제 장면을 기준 자료로 보낸다', () => {
    const sourceEpisode: Episode = {
      id: '현재화', title: 'AI 검수 첫날', idea: '줄리아가 사라진 사과를 찾는다', characterIds: ['c1'], worldId: 'w1',
      scenes: [{ id: '장면1', title: '오류 발견', action: '줄리아가 화면 속 사라진 사과를 가리킨다', dialogue: '사과가 사라졌어요.', camera: '', mood: '직장 코미디', negativePrompt: '', continuityOut: '제출 버튼을 누른 채 화면을 본다' }],
      beats: [{ id: '비트1', kind: 'hook', label: '훅', timeRange: '8초', purpose: '오류 발견', content: '사과가 사라진다', continuityOut: '화면을 가리킨다' }],
      status: 'draft', updatedAt: '', logline: '줄리아가 검수 오류를 찾아 첫 업무를 통과한다', ending: '오류를 제출한다', nextHook: '팀장이 다음 영상을 건넨다', fullScript: '줄리아는 사라진 사과를 발견하고 오류를 제출한다.',
    };
    const plan = buildNextEpisodePlan(project, sourceEpisode, '2026-09-01T00:00:00.000Z');
    const request = buildNextEpisodeProposalRequest(project, sourceEpisode, plan);

    expect(plan).toEqual(expect.objectContaining({ premise: '팀장이 다음 영상을 건넨다', protagonistId: 'c1', worldId: 'w1', sourceEpisodeId: '현재화', comedyModes: ['relatable', 'meme'] }));
    expect(request.sourceEpisode).toEqual(expect.objectContaining({
      id: '현재화', title: 'AI 검수 첫날', logline: '줄리아가 검수 오류를 찾아 첫 업무를 통과한다', ending: '오류를 제출한다', nextHook: '팀장이 다음 영상을 건넨다', fullScript: '줄리아는 사라진 사과를 발견하고 오류를 제출한다.',
    }));
    expect(request.sourceEpisode?.beats[0]).toEqual({ kind: 'hook', content: '사과가 사라진다', continuityOut: '화면을 가리킨다' });
    expect(request.sourceEpisode?.scenes[0]).toEqual(expect.objectContaining({ action: '줄리아가 화면 속 사라진 사과를 가리킨다', dialogue: '사과가 사라졌어요.' }));
  });
});
