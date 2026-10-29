import { describe, expect, it } from 'vitest';
import { sampleProject } from './sample-data';

describe('샘플 프로젝트', () => {
  it('바로 렌더링할 수 있는 캐릭터·세계관·에피소드를 가진다', () => {
    expect(sampleProject.characters.length).toBeGreaterThan(0);
    expect(sampleProject.worlds.length).toBeGreaterThan(0);
    expect(sampleProject.episodes[0].scenes.length).toBeGreaterThan(0);
  });
});
