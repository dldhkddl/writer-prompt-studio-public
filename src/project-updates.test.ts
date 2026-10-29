import { describe, expect, it } from 'vitest';
import {
  getNextCharacterIdAfterDeletion,
  getNextEpisodeIdAfterDeletion,
  patchCharacterInProject,
  removeCharacterFromProject,
  removeEpisodeFromProject,
} from './project-updates';
import type { Project } from './types';

describe('최신 프로젝트의 캐릭터 갱신', () => {
  it('캐릭터 사진을 늦게 반영해도 그 사이 수정된 에피소드와 다른 캐릭터를 보존한다', () => {
    const latest: Project = {
      characters: [
        { id: 'c1', name: '밤톨', type: 'animal', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' },
        { id: 'c2', name: '수정된 친구', type: 'human', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' },
      ],
      worlds: [],
      relationships: [],
      episodes: [{ id: 'e1', title: '방금 수정한 제목', idea: '', characterIds: [], scenes: [], status: 'draft', updatedAt: '2026-08-28' }],
      trends: [],
    };

    const next = patchCharacterInProject(latest, 'c1', { imageDataUrl: 'data:image/png;base64,AQID' });

    expect(next.episodes[0].title).toBe('방금 수정한 제목');
    expect(next.characters[1].name).toBe('수정된 친구');
    expect(next.characters[0].imageDataUrl).toBe('data:image/png;base64,AQID');
  });
});

describe('에피소드 삭제에 따른 프로젝트 정리', () => {
  const project: Project = {
    characters: [], worlds: [], relationships: [], trends: [],
    episodes: [
      { id: 'e1', title: '첫 편', idea: '', characterIds: [], scenes: [], status: 'draft', updatedAt: '' },
      { id: 'e2', title: '둘째 편', idea: '', characterIds: [], scenes: [], status: 'draft', updatedAt: '' },
      { id: 'e3', title: '셋째 편', idea: '', characterIds: [], scenes: [], status: 'draft', updatedAt: '' },
    ],
  };

  it('대상 에피소드만 제거하고 다른 프로젝트 자료는 보존한다', () => {
    const next = removeEpisodeFromProject(project, 'e2');
    expect(next.episodes.map(({ id }) => id)).toEqual(['e1', 'e3']);
    expect(next.characters).toBe(project.characters);
    expect(removeEpisodeFromProject(project, '없음')).toBe(project);
  });

  it('삭제 위치의 다음 에피소드를 우선하고 마지막이면 이전 편을 선택한다', () => {
    expect(getNextEpisodeIdAfterDeletion(project.episodes, 'e1')).toBe('e2');
    expect(getNextEpisodeIdAfterDeletion(project.episodes, 'e2')).toBe('e3');
    expect(getNextEpisodeIdAfterDeletion(project.episodes, 'e3')).toBe('e2');
    expect(getNextEpisodeIdAfterDeletion([project.episodes[0]], 'e1')).toBeUndefined();
  });
});

describe('캐릭터 삭제에 따른 프로젝트 정리', () => {
  const project: Project = {
    characters: [
      { id: 'c1', name: '밤톨', type: 'animal', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' },
      { id: 'c2', name: '친구', type: 'animal', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' },
      { id: 'c3', name: '이웃', type: 'human', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' },
    ],
    worlds: [{ id: 'w1', name: '동네', tone: '', setting: '', rules: [] }],
    relationships: [
      { id: 'r1', fromCharacterId: 'c1', toCharacterId: 'c2', kind: '친구', description: '' },
      { id: 'r2', fromCharacterId: 'c2', toCharacterId: 'c3', kind: '이웃', description: '' },
    ],
    episodes: [{
      id: 'e1',
      title: '산책',
      idea: '',
      characterIds: ['c1', 'c2'],
      scenes: [
        { id: 's1', title: '만남', action: '', dialogue: '', camera: '', mood: '', negativePrompt: '', characterIds: ['c1', 'c2'] },
        { id: 's2', title: '귀가', action: '', dialogue: '', camera: '', mood: '', negativePrompt: '' },
      ],
      status: 'draft',
      updatedAt: '2026-08-28',
    }],
    trends: [],
  };

  it('대상 캐릭터와 그 캐릭터가 연결된 관계 및 출연 참조만 제거한다', () => {
    const next = removeCharacterFromProject(project, 'c1');

    expect(next.characters.map(({ id }) => id)).toEqual(['c2', 'c3']);
    expect(next.relationships.map(({ id }) => id)).toEqual(['r2']);
    expect(next.episodes[0].characterIds).toEqual(['c2']);
    expect(next.episodes[0].scenes[0].characterIds).toEqual(['c2']);
    expect(next.episodes[0].scenes[1].characterIds).toBeUndefined();
    expect(next.worlds).toBe(project.worlds);
    expect(next.trends).toBe(project.trends);
  });

  it('연재 주인공을 삭제하면 다음 캐릭터를 선택하고 승인 대기 후보를 폐기한다', () => {
    const withSeries: Project = {
      ...project,
      seriesPlan: {
        premise: '첫 출근', protagonistId: 'c1', status: 'planning', comedyModes: ['relatable'],
        pendingProposals: [{} as never], createdAt: '2026-08-28', updatedAt: '2026-08-28',
      },
    };

    const next = removeCharacterFromProject(withSeries, 'c1');

    expect(next.seriesPlan?.protagonistId).toBe('c2');
    expect(next.seriesPlan?.pendingProposals).toEqual([]);
  });

  it('없는 캐릭터를 삭제하면 프로젝트를 변경하지 않는다', () => {
    expect(removeCharacterFromProject(project, '없는-캐릭터')).toBe(project);
  });

  it('삭제 위치의 다음 캐릭터를 우선하고 마지막이면 이전 캐릭터를 선택한다', () => {
    expect(getNextCharacterIdAfterDeletion(project.characters, 'c1')).toBe('c2');
    expect(getNextCharacterIdAfterDeletion(project.characters, 'c2')).toBe('c3');
    expect(getNextCharacterIdAfterDeletion(project.characters, 'c3')).toBe('c2');
    expect(getNextCharacterIdAfterDeletion([project.characters[0]], 'c1')).toBeUndefined();
  });
});
