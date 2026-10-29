import { describe, expect, it } from 'vitest';
import { createDefaultBeats, reviewStory, beatsToScenes } from './story-structure';

describe('시나리오 구조 엔진', () => {
  it('릴스용 7개 비트를 각각 8초 클립으로 만든다', () => {
    const beats = createDefaultBeats();
    expect(beats.map((beat) => beat.kind)).toEqual(['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next']);
    expect(beats.every((beat) => beat.timeRange === '8초')).toBe(true);
  });

  it('목표·장애물·결말과 핵심 비트가 빠지면 편집 경고를 만든다', () => {
    const issues = reviewStory({ logline: '', outerGoal: '', obstacle: '', ending: '', characterIds: [], beats: createDefaultBeats() });
    expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['missing-logline', 'missing-goal', 'missing-obstacle', 'missing-ending', 'missing-cast', 'empty-hook', 'empty-climax']));
  });

  it('내용이 있는 비트의 마지막 프레임 상태가 없으면 장면 생성을 막는 필수 경고를 만든다', () => {
    const beats = createDefaultBeats();
    beats[0] = { ...beats[0], content: '문을 연다', continuityOut: '' };
    const issues = reviewStory({ logline: '로그라인', outerGoal: '목표', obstacle: '장애물', ending: '결말', characterIds: ['c1'], beats });
    expect(issues).toContainEqual(expect.objectContaining({ code: 'missing-continuity-out', level: 'required' }));
  });

  it('작성한 비트를 목적과 감정 변화가 있는 장면 초안으로 바꾼다', () => {
    const beats = createDefaultBeats().map((beat) => ({ ...beat, content: `${beat.label} 내용`, continuityOut: `${beat.label} 마지막 자세` }));
    const scenes = beatsToScenes(beats, ['밤톨']);
    expect(scenes).toHaveLength(7);
    expect(scenes[0]).toMatchObject({ title: '훅', purpose: '첫 1~2초 안에 시선을 붙잡는다', beatKind: 'hook' });
    expect(scenes[0].action).toBe('훅 내용');
    expect(scenes[0].timeRange).toBe('8초');
    expect(scenes[0].characterIds).toEqual(['밤톨']);
    expect(scenes[0].continuityIn).toContain('에피소드 시작');
    expect(scenes[0].continuityOut).toBe('훅 마지막 자세');
    expect(scenes[1].continuityIn).toBe('훅 마지막 자세');
  });

  it('비트 안의 화자 대사를 장면 대사에도 보존한다', () => {
    const beat = { ...createDefaultBeats()[0], content: '직원이 손짓한다. 직원: “자료를 옮겨 주세요.” 줄리아: “네!” 줄리아가 서류를 든다.' };
    const [scene] = beatsToScenes([beat], ['줄리아']);
    expect(scene.action).toBe(beat.content);
    expect(scene.dialogue).toContain('직원: “자료를 옮겨 주세요.”');
    expect(scene.dialogue).toContain('줄리아: “네!”');
  });
});
