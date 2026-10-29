import type { Scene, StoryBeat } from './types';

const beatDefinitions: Omit<StoryBeat, 'id' | 'content'>[] = [
  { kind: 'hook', label: '훅', timeRange: '8초', purpose: '첫 1~2초 안에 시선을 붙잡는다' },
  { kind: 'setup', label: '상황 설정', timeRange: '8초', purpose: '주인공과 현재 상황을 빠르게 이해시킨다' },
  { kind: 'escalation', label: '갈등 상승', timeRange: '8초', purpose: '목표 달성을 방해하는 문제를 키운다' },
  { kind: 'twist', label: '전환', timeRange: '8초', purpose: '예상과 다른 정보나 선택을 제시한다' },
  { kind: 'climax', label: '클라이맥스', timeRange: '8초', purpose: '주인공이 가장 중요한 선택이나 행동을 한다' },
  { kind: 'punchline', label: '펀치라인', timeRange: '8초', purpose: '웃음이나 감정의 보상을 준다' },
  { kind: 'next', label: '다음 편 연결', timeRange: '8초', purpose: '다음 이야기를 궁금하게 만든다' },
];

export function createDefaultBeats(): StoryBeat[] {
  return beatDefinitions.map((beat) => ({ ...beat, id: `비트-${beat.kind}`, content: '', continuityOut: '' }));
}

export type StoryReviewInput = { logline?: string; outerGoal?: string; obstacle?: string; ending?: string; characterIds?: string[]; beats?: StoryBeat[] };
export type StoryIssue = { code: string; level: 'required' | 'improve'; message: string };

export function reviewStory(story: StoryReviewInput): StoryIssue[] {
  const issues: StoryIssue[] = [];
  if (!story.logline?.trim()) issues.push({ code: 'missing-logline', level: 'required', message: '주인공·목표·장애물이 드러나는 로그라인이 필요합니다.' });
  if (!story.outerGoal?.trim()) issues.push({ code: 'missing-goal', level: 'required', message: '주인공이 이번 화에서 이루려는 외적 목표를 적어주세요.' });
  if (!story.obstacle?.trim()) issues.push({ code: 'missing-obstacle', level: 'required', message: '목표를 방해하는 외부 장애물이 필요합니다.' });
  if (!story.ending?.trim()) issues.push({ code: 'missing-ending', level: 'required', message: '사건의 결과와 캐릭터 변화를 포함한 결말이 필요합니다.' });
  if (story.characterIds && story.characterIds.length === 0) issues.push({ code: 'missing-cast', level: 'required', message: '이야기를 이끌 출연 캐릭터를 한 명 이상 선택해주세요.' });
  const beats = story.beats ?? createDefaultBeats();
  const missingEndingStates = beats.filter((beat) => beat.content.trim() && !beat.continuityOut?.trim());
  if (missingEndingStates.length) issues.push({ code: 'missing-continuity-out', level: 'required', message: `장면을 연결하려면 ${missingEndingStates.map((beat) => beat.label).join(', ')}의 8초 마지막 프레임 상태를 적어주세요.` });
  for (const kind of ['hook', 'escalation', 'climax', 'punchline'] as const) {
    if (!beats.find((beat) => beat.kind === kind)?.content.trim()) issues.push({ code: `empty-${kind}`, level: 'improve', message: `${beatDefinitions.find((beat) => beat.kind === kind)?.label} 비트를 채워주세요.` });
  }
  if (story.outerGoal?.trim() && story.outerGoal.trim() === story.obstacle?.trim()) issues.push({ code: 'same-goal-obstacle', level: 'improve', message: '목표와 장애물이 같으면 갈등이 움직이지 않습니다.' });
  return issues;
}

export function beatsToScenes(beats: StoryBeat[], characterIds: string[] = []): Scene[] {
  const activeBeats = beats.filter((beat) => beat.content.trim());
  const endingState = (beat: StoryBeat) => beat.continuityOut?.trim() || '';
  return activeBeats.map((beat, index) => ({
    id: `장면-${Date.now()}-${index}`,
    title: beat.label,
    action: beat.content,
    dialogue: [...beat.content.matchAll(/(?:^|\s)([가-힣A-Za-z0-9_]{1,12}:\s*[“"][^”"\n]+[”"])/gu)].map((match) => match[1]).join(' / '),
    camera: index === 0 ? '세로형 9:16, 즉시 이해되는 강한 클로즈업 또는 움직임' : '세로형 9:16, 핵심 행동이 명확한 숏폼 카메라',
    mood: '현실적이고 캐릭터 중심인 숏폼 드라마',
    negativePrompt: '캐릭터 외형 변경, 장면과 무관한 인물·소품 추가, 손발 왜곡, 과도한 애니메이션풍 금지',
    purpose: beat.purpose,
    emotionBefore: '',
    emotionAfter: '',
    beatKind: beat.kind,
    timeRange: beat.timeRange,
    characterIds: [...characterIds],
    continuityIn: index === 0
      ? '에피소드 시작 상태에서 장면을 연다'
      : endingState(activeBeats[index - 1]),
    continuityOut: endingState(beat),
  }));
}
