import { describe, expect, it } from 'vitest';
import { normalizeProject, parseProjectJson, serializeProject } from './storage';

describe('기존 프로젝트 데이터 호환', () => {
  it('기존 동물 캐릭터에 성별 미지정과 사람처럼 행동하는 기본값을 보추한다', () => {
    const project = normalizeProject({
      characters: [{ id: 'c1', name: '줄리아', type: 'animal', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' }],
      worlds: [], relationships: [], trends: [], episodes: [],
    });
    expect(project.characters[0]).toEqual(expect.objectContaining({ gender: 'unspecified', behaviorStyle: 'humanlike' }));
  });

  it('연재 설정이 없는 기존 프로젝트는 그대로 열고 불완전한 연재 배열은 안전하게 보충한다', () => {
    const legacy = normalizeProject({ characters: [], worlds: [], relationships: [], trends: [], episodes: [] });
    expect(legacy.seriesPlan).toBeUndefined();

    const withSeries = normalizeProject({
      characters: [], worlds: [], relationships: [], trends: [], episodes: [],
      seriesPlan: {
        premise: '면접 준비를 시작한다', protagonistId: 'c1', status: 'planning', comedyModes: ['relatable'],
        pendingProposals: undefined, createdAt: '', updatedAt: '',
      } as never,
    });
    expect(withSeries.seriesPlan?.pendingProposals).toEqual([]);
    expect(withSeries.seriesPlan?.comedyModes).toEqual(['relatable']);
  });

  it('비트 시트가 없는 기존 에피소드에 7개 기본 비트를 보충한다', () => {
    const project = normalizeProject({ characters: [], worlds: [], relationships: [], trends: [], episodes: [{ id: 'old', title: '기존 화', idea: '아이디어', characterIds: [], scenes: [], status: 'draft', updatedAt: '2026-01-01' }] });
    expect(project.episodes[0].beats).toHaveLength(7);
    expect(project.episodes[0].logline).toBe('');
    expect(project.episodes[0].fullScript).toBe('');
  });

  it('기존 장면과 비트의 시간 구간을 8초로 바꾸고 연속 상태를 보충한다', () => {
    const project = normalizeProject({
      characters: [], worlds: [], relationships: [], trends: [],
      episodes: [{
        id: 'old', title: '기존 화', idea: '', characterIds: [], status: 'draft', updatedAt: '',
        beats: [{ id: 'b1', kind: 'hook', label: '훅', timeRange: '0–2초', purpose: '', content: '문을 연다' }],
        scenes: [
          { id: 's1', title: '문', timeRange: '0–2초', action: '문을 연다', dialogue: '', camera: '', mood: '', negativePrompt: '', continuityOut: '문고리를 잡고 문 안쪽을 본다' },
          { id: 's2', title: '입장', timeRange: '2–6초', action: '안으로 들어간다', dialogue: '', camera: '', mood: '', negativePrompt: '' },
        ],
      }],
    });

    expect(project.episodes[0].beats?.[0].timeRange).toBe('8초');
    expect(project.episodes[0].beats?.[0].continuityOut).toBe('문고리를 잡고 문 안쪽을 본다');
    expect(project.episodes[0].scenes.every((scene) => scene.timeRange === '8초')).toBe(true);
    expect(project.episodes[0].scenes[0].continuityIn).toContain('에피소드 시작');
    expect(project.episodes[0].scenes[1].continuityIn).toBe('문고리를 잡고 문 안쪽을 본다');
  });

  it('기준 이미지는 localStorage 직렬화에서 제외한다', () => {
    const serialized = serializeProject({ characters: [{ id: 'c1', name: '밤톨', type: 'animal', imageDataUrl: 'data:image/png;base64,large', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' }], worlds: [], relationships: [], trends: [], episodes: [] });
    expect(serialized).not.toContain('data:image');
  });

  it('이미지 저장소 이전이 끝나지 않았으면 기존 기준 이미지를 보존한다', () => {
    const serialized = serializeProject({ characters: [{ id: 'c1', name: '밤톨', type: 'animal', imageDataUrl: 'data:image/png;base64,recovery', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' }], worlds: [], relationships: [], trends: [], episodes: [] }, { preserveImages: true });
    expect(serialized).toContain('data:image/png;base64,recovery');
  });

  it('프로젝트 배열 구조가 손상된 저장값을 거부한다', () => {
    expect(() => parseProjectJson('{"episodes":"broken"}')).toThrow('저장 데이터 구조');
  });

  it('내부가 손상된 연재 후보와 시간선 메타데이터를 정상 데이터로 열지 않는다', () => {
    const base = { characters: [], worlds: [], relationships: [], trends: [], episodes: [] };
    expect(() => normalizeProject({
      ...base,
      seriesPlan: { premise: '시작', protagonistId: 'c1', status: 'planning', comedyModes: ['relatable'], pendingProposals: [null], createdAt: '', updatedAt: '' },
    } as never)).toThrow('연재');
    expect(() => normalizeProject({
      ...base,
      episodes: [{ id: 'e1', title: '첫 화', idea: '', characterIds: [], scenes: [], status: 'draft', updatedAt: '', seriesMeta: { sequence: 1, category: '회사', comedyMode: 'relatable', whyNow: '', stateChanges: [], openThreads: null, resolvedThreads: [], sourceProposalId: 'p1' } }],
    } as never)).toThrow('연재');
  });

  it('기존 강아지 대화 불가 규칙만 새 일상 세계관 규칙으로 교체한다', () => {
    const project = normalizeProject({
      characters: [], relationships: [], trends: [], episodes: [],
      worlds: [{
        id: 'w1', name: '일상', tone: '', setting: '',
        rules: ['사람들은 강아지의 말을 알아듣지 못한다', '사용자 규칙'],
      }],
    });

    expect(project.worlds[0].rules).not.toContain('사람들은 강아지의 말을 알아듣지 못한다');
    expect(project.worlds[0].rules).toContain('사람과 강아지는 서로의 말을 자연스럽게 알아듣고 대화한다');
    expect(project.worlds[0].rules).toContain('강아지 캐릭터는 사람처럼 두 발로 걷고 물건을 사용하며 일할 수 있다');
    expect(project.worlds[0].rules).toContain('사용자 규칙');
  });
});
