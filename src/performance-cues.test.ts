import { describe, expect, it } from 'vitest';
import { convertPerformanceCues } from './performance-cues';

describe('연기 메모 변환', () => {
  it('어버버를 실제 발화에서 제거하고 화면에 보이는 머뭇거림으로 바꾼다', () => {
    const result = convertPerformanceCues('줄리아: “어버버…”');
    expect(result.spokenText).toBe('');
    expect(result.actingDirection).toContain('입을 두어 번 달싹이고');
    expect(result.actingDirection).toContain('시선');
    expect(result.actingDirection).not.toContain('어버버');
  });

  it('일반 대사는 바꾸지 않는다', () => {
    expect(convertPerformanceCues('줄리아: “네, 바로 할게요.”')).toEqual({ spokenText: '줄리아: “네, 바로 할게요.”', actingDirection: '' });
  });

  it.each(['버벅임', '머뭇거리는 중', '말문이 막혀'])('%s 같은 연기 표현을 찌꺼기 없이 제거한다', (cue) => {
    const result = convertPerformanceCues(`줄리아: “${cue}”`);
    expect(result.spokenText).toBe('');
    expect(result.actingDirection).toContain('숨을 짧게 들이쉬고');
  });
});
