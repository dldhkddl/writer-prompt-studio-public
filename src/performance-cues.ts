const PERFORMANCE_CUE = /(?:(?:당황하면|긴장하면)\s*)?(?:어버버(?:거리(?:거나|며|는\s*중|는|다|고|기)?)?|버벅(?:거리(?:거나|며|는\s*중|는|다|고|기)?|임|인다)?|말문이\s*막(?:히거나|히며|힌다|힘|혀서|혀|히는\s*중)|머뭇(?:거리(?:거나|며|는\s*중|는|다|고|기)?|거림)?)/gu;

const HESITATION_DIRECTION = '입을 두어 번 달싹이고 시선이 잠깐 흔들리며, 첫 음절을 시작하지 못한 채 숨을 짧게 들이쉬고 손이나 앞발이 갈 곳을 찾지 못한다';

export function convertPerformanceCues(text: string): { spokenText: string; actingDirection: string } {
  const hasCue = PERFORMANCE_CUE.test(text);
  PERFORMANCE_CUE.lastIndex = 0;
  if (!hasCue) return { spokenText: text.trim(), actingDirection: '' };

  const spokenText = text
    .replace(PERFORMANCE_CUE, '')
    .replace(/[…]+/gu, ' ')
    .replace(/[“"]\s*[”"]/gu, ' ')
    .replace(/^\s*[^:/]{1,20}:\s*$/u, '')
    .replace(/\s+([,./!?])/gu, '$1')
    .replace(/^[\s,./]+|[\s,./]+$/gu, '')
    .replace(/\s{2,}/gu, ' ')
    .trim();

  return { spokenText, actingDirection: HESITATION_DIRECTION };
}
