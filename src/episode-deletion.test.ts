import { describe, expect, it, vi } from 'vitest';
import { deleteEpisodeAndChooseNext } from './episode-deletion';
import type { Project } from './types';

const project: Project = {
  characters: [], worlds: [], relationships: [], trends: [],
  episodes: [
    { id: 'e1', title: '첫 편', idea: '', characterIds: [], scenes: [{ id: 's1', title: '', action: '', dialogue: '', camera: '', mood: '', negativePrompt: '' }], status: 'draft', updatedAt: '' },
    { id: 'e2', title: '둘째 편', idea: '', characterIds: [], scenes: [{ id: 's2', title: '', action: '', dialogue: '', camera: '', mood: '', negativePrompt: '' }], status: 'draft', updatedAt: '' },
  ],
};

describe('에피소드 삭제 조정', () => {
  it('저장에 성공하면 다음 에피소드와 첫 장면을 선택 정보로 돌려준다', () => {
    const persist = vi.fn().mockReturnValue(true);
    expect(deleteEpisodeAndChooseNext(project, 'e1', persist)).toEqual({ deleted: true, episodeId: 'e2', sceneId: 's2' });
    expect(persist).toHaveBeenCalledWith(expect.objectContaining({ episodes: [project.episodes[1]] }));
  });

  it('마지막 편 삭제는 빈 선택을 반환하고 저장 실패 시 기존 선택을 유지한다', () => {
    expect(deleteEpisodeAndChooseNext({ ...project, episodes: [project.episodes[0]] }, 'e1', () => true)).toEqual({ deleted: true, episodeId: '', sceneId: '' });
    expect(deleteEpisodeAndChooseNext(project, 'e1', () => false)).toEqual({ deleted: false, episodeId: 'e1', sceneId: 's1' });
  });
});
