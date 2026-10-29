import { describe, expect, it } from 'vitest';
import { buildHiggsfieldPrompt } from './prompt-builder';
import { sampleProject } from './sample-data';

describe('첫 제작 흐름', () => {
  it('샘플 프로젝트에서 장면별 힉스필드 프롬프트를 만든다', () => {
    const episode = sampleProject.episodes[0];
    const scene = episode.scenes[0];
    const character = sampleProject.characters.filter((item) => episode.characterIds.includes(item.id));
    const prompt = buildHiggsfieldPrompt(scene, { episodeTitle: episode.title, characters: character, world: sampleProject.worlds[0], relationships: sampleProject.relationships });
    expect(prompt).toContain('INSTAGRAM REELS / HIGGSFIELD VIDEO PROMPT');
    expect(prompt).toContain(character[0].name);
    expect(prompt).toContain(scene.action);
  });
});
