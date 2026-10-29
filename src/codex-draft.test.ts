import { describe, expect, it } from 'vitest';
import { applyCodexDraft, buildCodexStoryRequest, buildEpisodeAvoid, buildIdeaFirstStoryRequest, buildStoryHistory } from './codex-draft';
import type { Episode, Project } from './types';

const episode: Episode = {
  id: 'e1', title: '첫 근무', idea: '밤톨이 첫 근무를 한다', worldId: 'w1', characterIds: ['c1', 'c2'], scenes: [], status: 'draft', updatedAt: '2026-08-28',
  logline: '기존 로그라인', beats: [
    { id: 'b1', kind: 'hook', label: '훅', timeRange: '0–2초', purpose: '시선 확보', content: '기존 훅' },
    { id: 'b2', kind: 'setup', label: '상황 설정', timeRange: '2–6초', purpose: '상황 설명', content: '기존 설정' },
  ],
};
const project: Project = {
  characters: [
    { id: 'c1', name: '밤톨', type: 'animal', imageDataUrl: 'data:image/png;base64,private-photo', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' },
    { id: 'c2', name: '사장', type: 'human', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' },
    { id: 'c3', name: '손님', type: 'human', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' },
  ],
  worlds: [{ id: 'w1', name: '멍멍시', tone: '', setting: '', rules: [] }],
  relationships: [
    { id: 'r1', fromCharacterId: 'c1', toCharacterId: 'c2', kind: '알바생과 사장', description: '' },
    { id: 'r2', fromCharacterId: 'c1', toCharacterId: 'c3', kind: '손님', description: '' },
  ],
  episodes: [episode], trends: [],
};

describe('Codex 초안 요청과 적용', () => {
  it('에피소드 출연진·선택 세계관·관련 관계만 요청에 포함한다', () => {
    const request = buildCodexStoryRequest(project, episode);
    expect(request.characters.map((character) => character.id)).toEqual(['c1', 'c2']);
    expect(request.characters[0]).not.toHaveProperty('imageDataUrl');
    expect(request.world?.id).toBe('w1');
    expect(request.relationships.map((relationship) => relationship.id)).toEqual(['r1']);
    expect(request.episode.title).toBe('첫 근무');
  });

  it('전체 대본 생성은 새 한 줄 아이디어만 이야기 재료로 쓰고 이전 결과는 회피 목록으로만 넘긴다', () => {
    const changed = {
      ...episode,
      idea: '줄라이가 시청자에게 처음 인사한다',
      logline: '이전 과일 검수 이야기',
      theme: '이전 주제',
      fullScript: '이전 전체 대본',
    };

    const request = buildIdeaFirstStoryRequest(project, changed);

    expect(request.episode).toEqual({ id: 'e1', title: '첫 근무', idea: '줄라이가 시청자에게 처음 인사한다' });
    expect(JSON.stringify(request.episode)).not.toContain('이전 과일 검수 이야기');
    expect(JSON.stringify(request.episode)).not.toContain('기존 훅');
    expect(JSON.stringify(request)).not.toContain('이전 주제');
    expect(request.characters.map((character) => character.id)).toEqual(['c1', 'c2']);
    expect(request.world?.id).toBe('w1');
  });

  it('다시 생성할 때 이미 나온 대본과 비트를 회피 목록으로 함께 보낸다', () => {
    const generated = { ...episode, logline: '이전 로그라인', ending: '이전 결말', fullScript: '이전 전체 대본' };

    const request = buildIdeaFirstStoryRequest(project, generated);

    expect(request.avoid).toEqual({
      fullScript: '이전 전체 대본',
      logline: '이전 로그라인',
      ending: '이전 결말',
      beats: ['기존 훅', '기존 설정'],
    });
  });

  it('아직 아무것도 만들지 않았으면 회피 목록을 보내지 않는다', () => {
    const blank = { ...episode, logline: '', ending: '', fullScript: '', beats: [] };

    expect(buildEpisodeAvoid(blank)).toBeUndefined();
    expect(buildIdeaFirstStoryRequest(project, blank)).not.toHaveProperty('avoid');
  });

  it('초안 요청에는 회피 목록을 넣지 않는다', () => {
    const generated = { ...episode, fullScript: '이전 전체 대본' };

    expect(buildCodexStoryRequest(project, generated)).not.toHaveProperty('avoid');
  });

  it('같은 세계관의 최근 다른 화만 중복 확인용 기록으로 보낸다', () => {
    const older = { ...episode, id: 'e0', title: '지난 화', idea: '지난 아이디어', ending: '지난 결말', updatedAt: '2026-08-20' };
    const newer = { ...episode, id: 'e2', title: '최근 화', idea: '최근 아이디어', twist: '최근 반전', updatedAt: '2026-08-27' };
    const otherWorld = { ...episode, id: 'e3', title: '다른 세계관 화', worldId: 'w9', updatedAt: '2026-08-28' };
    const withHistory = { ...project, episodes: [episode, older, newer, otherWorld] };

    const history = buildStoryHistory(withHistory, episode);

    expect(history.map((item) => item.id)).toEqual(['e2', 'e0']);
    expect(history[0]).toEqual({ id: 'e2', title: '최근 화', idea: '최근 아이디어', logline: '기존 로그라인', twist: '최근 반전' });
    expect(buildCodexStoryRequest(withHistory, episode).history?.map((item) => item.id)).toEqual(['e2', 'e0']);
    expect(buildIdeaFirstStoryRequest(withHistory, episode).history?.map((item) => item.id)).toEqual(['e2', 'e0']);
  });

  it('비교할 다른 화가 없으면 기록을 보내지 않는다', () => {
    expect(buildStoryHistory(project, episode)).toEqual([]);
    expect(buildCodexStoryRequest(project, episode)).not.toHaveProperty('history');
  });

  it('원본을 바꾸지 않고 이야기 필드와 기존 비트의 내용만 적용한다', () => {
    const result = applyCodexDraft(episode, { logline: '새 로그라인', beats: [{ kind: 'hook', content: '새 훅', continuityOut: '문 앞에 멈춘 자세' }], editorNotes: [] });
    expect(result.logline).toBe('새 로그라인');
    expect(result.beats?.[0]).toEqual({ ...episode.beats?.[0], content: '새 훅', continuityOut: '문 앞에 멈춘 자세' });
    expect(result.beats?.[1]).toEqual(episode.beats?.[1]);
    expect(episode.logline).toBe('기존 로그라인');
    expect(episode.beats?.[0].content).toBe('기존 훅');
  });

  it('빈 제안은 기존 원고와 비트 내용을 덮어쓰지 않는다', () => {
    const result = applyCodexDraft(episode, {
      logline: '   ',
      beats: [{ kind: 'hook', content: '', continuityOut: '' }],
      editorNotes: [],
    });

    expect(result.logline).toBe('기존 로그라인');
    expect(result.beats?.[0].content).toBe('기존 훅');
  });
});
