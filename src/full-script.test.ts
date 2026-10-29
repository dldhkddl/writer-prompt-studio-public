import { describe, expect, it } from 'vitest';
import { buildFullScriptDownloadText, formatFullScript } from './full-script';
import type { Episode, StoryBeat } from './types';

const beats: StoryBeat[] = [
  { id: 'b1', kind: 'hook', label: '훅', timeRange: '8초', purpose: '', content: '줄라이가 카메라를 가까이 본다. 줄라이: “이거 켜진 건가?”', continuityOut: '카메라 앞에 얼굴을 가까이 댄 상태' },
  { id: 'b2', kind: 'setup', label: '상황 설정', timeRange: '8초', purpose: '', content: '줄라이가 의자에 앉아 인사한다.', continuityOut: '의자에 바르게 앉은 상태' },
];

describe('약 1분 전체 대본', () => {
  it('연속 비트를 누적 시간과 마지막 상태가 있는 읽기용 대본으로 묶는다', () => {
    const script = formatFullScript(beats);

    expect(script).toContain('[장면 1 · 0~8초 · 훅]');
    expect(script).toContain('줄라이: “이거 켜진 건가?”');
    expect(script).toContain('마지막 상태: 카메라 앞에 얼굴을 가까이 댄 상태');
    expect(script).toContain('[장면 2 · 8~16초 · 상황 설정]');
  });

  it('다운로드 문서에 제목·길이·아이디어·로그라인·주제와 전체 대본을 넣는다', () => {
    const episode = {
      id: 'e1', title: '안녕하세요, 줄라이입니다', idea: '줄라이가 첫인사를 한다', logline: '완벽하게 인사하려다 진짜 모습을 보인다', theme: '솔직함',
      fullScript: formatFullScript(beats), characterIds: ['c1'], scenes: [], status: 'draft', updatedAt: '', beats,
    } as Episode;

    const document = buildFullScriptDownloadText(episode);

    expect(document).toContain('안녕하세요, 줄라이입니다');
    expect(document).toContain('예상 길이: 16초');
    expect(document).toContain('한 줄 아이디어: 줄라이가 첫인사를 한다');
    expect(document).toContain('로그라인: 완벽하게 인사하려다 진짜 모습을 보인다');
    expect(document).toContain('이번 화의 주제: 솔직함');
    expect(document).toContain('[장면 1 · 0~8초 · 훅]');
  });
});
