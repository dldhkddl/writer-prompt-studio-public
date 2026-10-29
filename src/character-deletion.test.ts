import { describe, expect, it, vi } from 'vitest';
import { scheduleCharacterDeletion } from './character-deletion';
import type { Project } from './types';

const project: Project = {
  characters: [
    { id: 'c1', name: '밤톨', type: 'animal', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' },
    { id: 'c2', name: '친구', type: 'animal', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' },
  ],
  worlds: [],
  relationships: [{ id: 'r1', fromCharacterId: 'c1', toCharacterId: 'c2', kind: '친구', description: '' }],
  episodes: [],
  trends: [],
};

describe('캐릭터 삭제 저장 순서', () => {
  it('정리된 프로젝트를 저장한 뒤 사진 삭제를 예약한다', () => {
    const order: string[] = [];
    let persisted: Project | undefined;

    const deleted = scheduleCharacterDeletion({
      project,
      characterId: 'c1',
      persistProject: (next) => { order.push('프로젝트'); persisted = next; return true; },
      deleteImage: async () => { order.push('사진'); },
      onImageCleanupError: () => {},
    });

    expect(deleted).toBe(true);
    expect(order).toEqual(['프로젝트', '사진']);
    expect(persisted?.characters.map(({ id }) => id)).toEqual(['c2']);
    expect(persisted?.relationships).toEqual([]);
  });

  it('프로젝트 저장이 실패하면 사진을 삭제하지 않는다', () => {
    const deleteImage = vi.fn(async () => {});

    const deleted = scheduleCharacterDeletion({
      project,
      characterId: 'c1',
      persistProject: () => false,
      deleteImage,
      onImageCleanupError: () => {},
    });

    expect(deleted).toBe(false);
    expect(deleteImage).not.toHaveBeenCalled();
  });

  it('사진 삭제 실패는 프로젝트 삭제를 되돌리지 않고 별도 안내한다', async () => {
    const onImageCleanupError = vi.fn();

    const deleted = scheduleCharacterDeletion({
      project,
      characterId: 'c1',
      persistProject: () => true,
      deleteImage: async () => { throw new Error('사진 실패'); },
      onImageCleanupError,
    });

    expect(deleted).toBe(true);
    await vi.waitFor(() => expect(onImageCleanupError).toHaveBeenCalledOnce());
  });
});
