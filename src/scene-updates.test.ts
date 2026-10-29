import { describe, expect, it } from 'vitest';
import { moveSceneAndInvalidateFollowing, patchSceneAndInvalidateFollowing } from './scene-updates';
import type { Scene } from './types';

const scene = (id: string): Scene => ({
  id,
  title: id,
  timeRange: '8초',
  action: `${id} 행동`,
  dialogue: '',
  camera: '',
  mood: '',
  negativePrompt: '',
  higgsfieldPrompt: `${id} 승인 프롬프트`,
  higgsfieldPromptSourceKey: `hf-${id}`,
});

describe('연속 장면 수정', () => {
  it('앞 장면을 수정하면 그 장면과 모든 뒤 장면의 승인 프롬프트를 무효화한다', () => {
    const result = patchSceneAndInvalidateFollowing([scene('s1'), scene('s2'), scene('s3')], 's1', { action: '수정된 행동' });

    expect(result[0].action).toBe('수정된 행동');
    expect(result.every((item) => item.higgsfieldPrompt === undefined && item.higgsfieldPromptSourceKey === undefined)).toBe(true);
  });

  it('마지막 장면을 수정해도 앞 장면의 승인 프롬프트는 유지한다', () => {
    const result = patchSceneAndInvalidateFollowing([scene('s1'), scene('s2')], 's2', { mood: '차분함' });

    expect(result[0].higgsfieldPrompt).toBe('s1 승인 프롬프트');
    expect(result[1].higgsfieldPrompt).toBeUndefined();
  });

  it('종료 상태를 바꾸면 바로 다음 장면 시작 상태도 같은 값으로 맞춘다', () => {
    const result = patchSceneAndInvalidateFollowing([scene('s1'), { ...scene('s2'), continuityIn: '오른쪽에 앉아 있다' }], 's1', { continuityOut: '왼쪽에 서 있다' });
    expect(result[1].continuityIn).toBe('왼쪽에 서 있다');
  });

  it('Sol 승인 저장은 뒤 장면 프롬프트를 삭제하지 않는다', () => {
    const result = patchSceneAndInvalidateFollowing([scene('s1'), scene('s2')], 's1', { higgsfieldPrompt: '새 승인', higgsfieldPromptSourceKey: 'hf-new' });
    expect(result[0].higgsfieldPrompt).toBe('새 승인');
    expect(result[1].higgsfieldPrompt).toBe('s2 승인 프롬프트');
  });

  it('장면 순서를 바꾸면 영향받는 위치부터 끝까지 프롬프트를 무효화하고 시작 상태를 다시 잇는다', () => {
    const scenes = [
      { ...scene('s1'), continuityOut: '상태 1' },
      { ...scene('s2'), continuityOut: '상태 2' },
      { ...scene('s3'), continuityOut: '상태 3' },
      scene('s4'),
    ];
    const result = moveSceneAndInvalidateFollowing(scenes, 's1', 1);
    expect(result.map((item) => item.id)).toEqual(['s2', 's1', 's3', 's4']);
    expect(result.every((item) => item.higgsfieldPrompt === undefined)).toBe(true);
    expect(result[1].continuityIn).toBe('상태 2');
    expect(result[2].continuityIn).toBe('상태 1');
    expect(result[3].continuityIn).toBe('상태 3');
  });
});
