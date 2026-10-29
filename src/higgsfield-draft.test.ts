import { describe, expect, it } from 'vitest';
import { buildHiggsfieldDraftRequest } from './higgsfield-draft';
import type { Episode, Project } from './types';

const scene = { id: 's1', title: '첫 업무', action: '서류를 흩뜨린다', dialogue: '네!', camera: '줌인', mood: '코미디', negativePrompt: '왜곡 금지', characterIds: ['c1'] };
const episode: Episode = { id: 'e1', title: '첫 출근', idea: '첫 업무', worldId: 'w1', characterIds: ['c1'], scenes: [scene], status: 'draft', updatedAt: '2026-08-28', logline: '실수를 수습한다', theme: '성실함' };
const project: Project = {
  characters: [{ id: 'c1', name: '줄리아', type: 'animal', imageDataUrl: 'data:image/png;base64,private', appearance: '검은색 시바견', personality: '성실함', voice: '해맑음', habits: '꼬리를 흔든다', likes: '칭찬', dislikes: '혼나는 것' }],
  worlds: [{ id: 'w1', name: '일상 도시', tone: '현실 코미디', setting: '한국 사무실', rules: ['사람과 강아지는 자연스럽게 대화한다'] }],
  relationships: [], episodes: [episode], trends: [],
};

describe('힉스필드 Sol 요청 만들기', () => {
  it('현재 장면과 출연 캐릭터만 보내고 사진 원문 대신 첨부 여부만 보낸다', () => {
    const request = buildHiggsfieldDraftRequest(project, episode, scene);

    expect(request.scene).toEqual(expect.objectContaining({ id: scene.id, action: scene.action }));
    expect(request.scene).not.toHaveProperty('timeRange');
    expect(request.characters[0]).toEqual(expect.objectContaining({ name: '줄리아', hasReferenceImage: true }));
    expect(request.characters[0]).not.toHaveProperty('imageDataUrl');
    expect(request.world?.id).toBe('w1');
  });

  it('장면 출연진을 비워두면 에피소드 전체 출연진을 다시 넣지 않는다', () => {
    const request = buildHiggsfieldDraftRequest(project, episode, { ...scene, characterIds: [] });
    expect(request.characters).toEqual([]);
  });

  it('둘째 장면 요청에는 직전 장면의 연결 상태를 포함하고 저장된 프롬프트는 제외한다', () => {
    const previous = { ...scene, id: 's0', title: '지시', continuityOut: '서류를 든 채 왼쪽에 선다', higgsfieldPrompt: '제외할 값', higgsfieldPromptSourceKey: 'hf-old' };
    const current = { ...scene, id: 's1', title: '실수', continuityIn: '서류를 든 채 왼쪽에 선다' };
    const connectedEpisode = { ...episode, scenes: [previous, current] };
    const request = buildHiggsfieldDraftRequest({ ...project, episodes: [connectedEpisode] }, connectedEpisode, current);

    expect(request.previousScene).toEqual(expect.objectContaining({ id: 's0', continuityOut: '서류를 든 채 왼쪽에 선다' }));
    expect(request.previousScene).not.toHaveProperty('higgsfieldPrompt');
    expect(request.scene.continuityIn).toBe('서류를 든 채 왼쪽에 선다');
  });
});
