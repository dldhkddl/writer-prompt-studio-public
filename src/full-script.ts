import type { Episode, StoryBeat } from './types';

export function formatFullScript(beats: StoryBeat[]): string {
  return beats
    .filter((beat) => beat.content.trim())
    .map((beat, index) => {
      const start = index * 8;
      const end = start + 8;
      const ending = beat.continuityOut?.trim() ? `\n마지막 상태: ${beat.continuityOut.trim()}` : '';
      return `[장면 ${index + 1} · ${start}~${end}초 · ${beat.label}]\n${beat.content.trim()}${ending}`;
    })
    .join('\n\n');
}

export function buildFullScriptDownloadText(episode: Episode): string {
  const duration = (episode.beats ?? []).filter((beat) => beat.content.trim()).length * 8;
  return [
    episode.title || '제목 없는 에피소드',
    `예상 길이: ${duration}초`,
    '',
    `한 줄 아이디어: ${episode.idea || '비어 있음'}`,
    `로그라인: ${episode.logline || '비어 있음'}`,
    `이번 화의 주제: ${episode.theme || '비어 있음'}`,
    '',
    '전체 대본',
    episode.fullScript?.trim() || formatFullScript(episode.beats ?? []) || '비어 있음',
  ].join('\n');
}
