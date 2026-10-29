import type { Character, Episode, Relationship, Scene, World } from './types';
import { convertPerformanceCues } from './performance-cues';
import { buildApprovedReferenceAssetRules } from './reference-assets';

export type PromptContext = {
  characters: (Pick<Character, 'name' | 'appearance' | 'personality' | 'voice'> & Partial<Pick<Character, 'id' | 'type' | 'gender' | 'behaviorStyle' | 'habits' | 'likes' | 'dislikes' | 'imageDataUrl'>>)[];
  world?: Pick<World, 'name' | 'tone' | 'setting' | 'rules' | 'workplace'>;
  relationships: Relationship[];
  episodeTitle: string;
  story?: Pick<Episode, 'logline' | 'theme' | 'outerGoal' | 'obstacle'>;
  previousScene?: Pick<Scene, 'title' | 'action' | 'dialogue' | 'continuityOut'>;
};

const section = (label: string, value?: string) => value?.trim() ? `${label}: ${value.trim()}` : '';
const workplaceLines = (world?: PromptContext['world']) => world?.workplace ? [
  section('Company name', world.workplace.companyName),
  section('Company industry', world.workplace.industry),
  section('Department', world.workplace.department),
  section('Role', world.workplace.role),
  section('Duties', world.workplace.duties),
  'Workplace rule: fixed canon; do not change the company, department, or role without approval.',
].filter(Boolean) : [];

export function buildHiggsfieldPrompt(scene: Scene, context: PromptContext): string {
  const characterLines = context.characters.flatMap((character) => [
    section('Character', character.name),
    section('Type', character.type),
    section('Behavior style', character.behaviorStyle === 'humanlike' ? '사람처럼 행동' : character.behaviorStyle === 'animal' ? '동물처럼 행동' : character.behaviorStyle === 'mixed' ? '혼합' : ''),
    section('Appearance', character.appearance),
    section('Personality', character.personality),
    section('Habits', character.habits),
    section('Likes', character.likes),
    section('Dislikes', character.dislikes),
    character.imageDataUrl ? 'Reference image: attached character image' : '',
  ]).filter(Boolean);
  const characterNames = new Map(context.characters.filter((character) => character.id).map((character) => [character.id!, character.name]));
  const relationshipLines = context.relationships.flatMap((relationship) => {
    const from = characterNames.get(relationship.fromCharacterId);
    const to = characterNames.get(relationship.toCharacterId);
    return from && to ? [section('Relationship', `${from} → ${to} / ${relationship.kind} / ${relationship.description}`)] : [];
  });
  const worldLines = context.world ? [section('World', context.world.name), section('Tone', context.world.tone), section('Setting', context.world.setting), ...context.world.rules.map((rule) => section('World rule', rule)), ...workplaceLines(context.world)].filter(Boolean) : [];
  const storyLines = context.story ? [section('Story logline', context.story.logline), section('Theme', context.story.theme), section('Protagonist goal', context.story.outerGoal), section('Main obstacle', context.story.obstacle)].filter(Boolean) : [];
  const emotionalChange = scene.emotionBefore?.trim() || scene.emotionAfter?.trim() ? `${scene.emotionBefore?.trim() || '시작 감정'} → ${scene.emotionAfter?.trim() || '도착 감정'}` : '';
  const referenceRules = buildApprovedReferenceAssetRules(scene.referenceAssets);
  const physicalBlocking = buildPhysicalBlockingDirection(scene.action);
  const screenGraphics = buildScreenGraphicsDirection(scene);
  const lines = [
    'INSTAGRAM REELS / HIGGSFIELD VIDEO PROMPT',
    `Episode: ${context.episodeTitle}`,
    ...(storyLines.length ? ['STORY INTENT', ...storyLines] : []),
    'CHARACTERS', ...characterLines,
    ...(relationshipLines.length ? ['RELATIONSHIPS', ...relationshipLines] : []),
    'SCENE ACTION', section('Scene title', scene.title), section('Scene purpose', scene.purpose), section('Emotional change', emotionalChange), section('Action', scene.action), section('Dialogue', scene.dialogue),
    ...(referenceRules ? ['APPROVED REFERENCE IMAGES', referenceRules] : []),
    'PHYSICAL BLOCKING', physicalBlocking,
    ...(screenGraphics ? ['SCREEN GRAPHICS', screenGraphics] : []),
    ...(worldLines.length ? ['ENVIRONMENT', ...worldLines] : []),
    'CAMERA', section('Camera', withoutVideoTechnicalSettings(scene.camera)),
    'MOOD', section('Mood', scene.mood),
    'NEGATIVE', section('Negative prompt', scene.negativePrompt),
    'Maintain character identity, facial features, proportions, and visual continuity across frames.',
  ];
  return lines.filter(Boolean).join('\n');
}

export const buildHiggsfieldReferenceBrief = buildHiggsfieldPrompt;

const promptPhrase = (value?: string) => value?.trim().replace(/[.!?。！？]+/g, ',').replace(/\s+/g, ' ').replace(/,+$/g, '') ?? '';
const withoutVideoTechnicalSettings = (value?: string) => promptPhrase(value)
  .replace(/(?:세로형\s*)?9\s*:\s*16/giu, '')
  .replace(/\d+\s*[~～–—-]\s*\d+\s*초(?:에는|동안)?/gu, '')
  .replace(/첫\s*\d+(?:\.\d+)?\s*초(?:\s*동안)?/gu, '시작에는')
  .replace(/\b\d+(?:\.\d+)?\s*초(?:\s*동안)?/gu, '')
  .replace(/\b(?:4K|8K|1080P|720P)\b|초고화질|고화질|해상도/giu, '')
  .replace(/\s{2,}/g, ' ')
  .replace(/^\s*[,;]\s*|\s*[,;]\s*$/g, '')
  .trim();
const humanlikeAnimalDirection = '강아지 외형과 털·얼굴·발 모양은 그대로 유지하되 행동과 사회적 반응은 사람과 동일하고 사람과 자연스럽게 대화한다, 일하고 걷고 의자에 앉는 장면에서는 두 발 행동을 기본으로 하며 앞발은 강아지 발 외형을 유지한 채 사람의 손처럼 사용한다, 사람의 시선·표정·대화 타이밍과 업무 동작을 사용한다, 냄새 맡기·혀 내밀기·헥헥거리기·짧은 네 발 동작은 장면과 감정에 자연스러우면 허용하되 맥락 없이 반복하거나 사람 같은 핵심 행동을 방해하지 않는다';
const overlapRiskPattern = /노트북|키보드|모니터|책상|테이블|의자|카운터/u;
const buildPhysicalBlockingDirection = (action?: string) => {
  const base = '물리 블로킹은 행동 전에 캐릭터와 소품 위치를 고정하고, 양팔의 어깨→팔꿈치→손목 연속 경로와 실제 접촉점, 카메라 기준 앞뒤 가림 순서를 구체적으로 유지하며 신체가 소품을 관통하거나 소품 뒤에서 갑자기 나오지 않게 한다';
  return overlapRiskPattern.test(action ?? '')
    ? `${base}, 팔다리와 큰 소품이 겹치는 이 장면은 완전 정면 고정 구도 대신 약 30도 사선 구도를 우선해 관절과 접촉면을 모두 보이게 한다`
    : base;
};
const screenContentPattern = /화면|노트북|모니터|스마트폰|휴대폰|태블릿|간판|로고|버튼|\bUI\b/u;
const screenFocusPattern = /화면|디스플레이|로고|문구|자막|버튼|\bUI\b/u;
const hasScreenFocus = (scene: Scene) => screenFocusPattern.test([scene.action, scene.continuityIn, scene.continuityOut, scene.camera].filter(Boolean).join(' '));
const rewriteOnScreenText = (value: string) => value.replace(
  /(화면(?:에|에는)?\s*)[‘“"'「『][^’”"'」』]+[’”"'」』]/gu,
  '$1@screen의 완성된 UI',
);
const buildScreenGraphicsDirection = (scene: Scene) => {
  const source = [scene.action, scene.continuityIn, scene.continuityOut, scene.camera, scene.negativePrompt].filter(Boolean).join(' ');
  if (!screenContentPattern.test(source)) return '';
  return '화면 그래픽은 영상 모델이 새로 쓰지 않는다, 완성 화면 이미지 @screen을 디스플레이 평면에 고정된 정적인 2D 화면 텍스처로 그대로 사용하고 내부의 한국어 글자·로고·버튼·색상·배치를 번역·재작성·변형하지 않는다, @screen이 없으면 글자 없는 중립 화면으로 두고 텍스트와 로고는 후편집하며 중국어·영어·임의 문자·추가 로고·자동 자막 생성을 금지한다';
};
const behaviorDirection = (character: PromptContext['characters'][number]) => {
  if (character.type !== 'animal') return '';
  if ((character.behaviorStyle ?? 'humanlike') === 'humanlike') return humanlikeAnimalDirection;
  if (character.behaviorStyle === 'mixed') return '기본은 사람처럼 두 발로 행동하되 장면에 적힌 동물 행동만 제한적으로 사용한다';
  return '동물 본연의 자세와 행동을 사용한다';
};

export function buildHiggsfieldExecutionPrompt(scene: Scene, context: PromptContext): string {
  const actingDirections = new Set<string>();
  const safePerformanceText = (value?: string) => {
    const converted = convertPerformanceCues(value ?? '');
    if (converted.actingDirection) actingDirections.add(converted.actingDirection);
    return promptPhrase(converted.spokenText);
  };
  const characterDetails = context.characters.map((character) => [
    safePerformanceText(character.appearance), promptPhrase(character.name), safePerformanceText(character.personality), safePerformanceText(character.habits),
    behaviorDirection(character),
    character.imageDataUrl ? '첨부된 캐릭터 이미지를 외형 기준으로 삼는다' : '',
  ].filter(Boolean).join(', ')).join('; ');
  context.characters.forEach((character) => safePerformanceText(character.voice));
  const workplaceDetails = context.world?.workplace
    ? [`고정 직장은 ${context.world.workplace.companyName || '미정'} 이름의 ${context.world.workplace.industry}`, `소속은 ${context.world.workplace.department}`, `직급·역할은 ${context.world.workplace.role}`, `담당 업무는 ${context.world.workplace.duties}`, '회사명이 미정이면 임의 이름을 만들지 않고 승인 없이 다른 회사·부서·직무로 변경하지 않는다']
    : [];
  const worldDetails = context.world
    ? [context.world.setting, context.world.tone, ...context.world.rules, ...workplaceDetails].map(promptPhrase).filter(Boolean).join(', ')
    : '장면에 적힌 공간과 현실적인 일상 배경';
  const emotionalChange = [promptPhrase(scene.emotionBefore), promptPhrase(scene.emotionAfter)].filter(Boolean).join('에서 ') || '행동에 맞는 감정 변화';
  const rawAction = safePerformanceText(scene.action) || '장면 목적에 맞는 핵심 행동을 순서대로 보여준다';
  const screenGraphics = buildScreenGraphicsDirection(scene);
  const screenFocus = hasScreenFocus(scene);
  const action = screenGraphics ? rewriteOnScreenText(rawAction) : rawAction;
  const dialogueCue = convertPerformanceCues(scene.dialogue);
  if (dialogueCue.actingDirection) actingDirections.add(dialogueCue.actingDirection);
  const dialogue = dialogueCue.spokenText
    ? `등장인물은 ${dialogueCue.spokenText}라는 실제 대사만 말하고, 말한 직후 표정과 몸짓으로 자연스럽게 반응한다.`
    : '대사가 없는 순간에는 시선과 표정, 몸짓으로 반응을 분명하게 보여준다.';
  const camera = [withoutVideoTechnicalSettings(scene.camera), promptPhrase(scene.mood)].filter(Boolean).join(', ') || '핵심 행동이 잘 보이는 현실적인 숏폼 카메라';
  const negative = promptPhrase(scene.negativePrompt) || '캐릭터 외형 변경과 신체 왜곡 금지';

  const previousState = context.previousScene
    ? safePerformanceText(context.previousScene.continuityOut || context.previousScene.action)
    : '';
  const continuityIn = previousState || safePerformanceText(scene.continuityIn) || '에피소드 시작 상태';
  const continuityOut = safePerformanceText(scene.continuityOut) || `현재 핵심 행동이 끝난 자세와 위치를 유지한다`;
  const acting = [...actingDirections].join(', ');
  const referenceRules = buildApprovedReferenceAssetRules(scene.referenceAssets);
  const physicalBlocking = buildPhysicalBlockingDirection(scene.action);
  const visualSafety = [physicalBlocking, screenGraphics].filter(Boolean).join('; ');
  const progressionLines = screenFocus ? [
    `시작에는 ${context.previousScene ? '이전 클립의 마지막 프레임을 시작 프레임으로 사용하고 ' : ''}${continuityIn} 상태에서 ${action}을 수행하되, 노트북을 사용하는 캐릭터의 행동과 표정을 약 30도 측면 구도로 보여주고 화면 내부는 카메라가 읽을 수 없게 둔다${acting ? `; 이때 ${acting}` : ''}.`,
    '화면 전환에서는 카메라가 캐릭터의 어깨너머로 노트북 화면에 빠르게 접근하고, 화면 가장자리의 짧은 모션 블러로 이미지 전환점을 자연스럽게 숨긴다.',
    `마무리에는 영상 모델이 화면을 다시 그리지 않고 @screen이 프레임 전체를 채우는 완성 화면 인서트로 즉시 전환해 모든 픽셀을 정지 상태로 유지하며, 다음 클립은 ${continuityOut} 상태로 이어진다.`,
  ] : [
    `시작에는 ${context.previousScene ? '이전 클립의 마지막 프레임을 시작 프레임으로 사용하고 ' : ''}${continuityIn} 상태를 그대로 보여준 뒤 핵심 행동을 시작한다${acting ? `; 이때 ${acting}` : ''}.`,
    `핵심 행동에서는 ${action}; 감정은 ${emotionalChange}로 이동하며 행동의 원인과 결과가 화면에서 연속해서 보인다.`,
    `마무리에는 ${continuityOut} 상태로 끝내 다음 클립이 같은 위치·자세·소품·의상·감정에서 바로 이어지게 한다.`,
  ];

  return [
    `${characterDetails || '장면에 지정된 캐릭터'}가 주체다.`,
    referenceRules,
    `배경은 ${worldDetails}이며, 실제 공간의 자연스러운 조명과 재질을 유지한다.`,
    ...progressionLines.slice(0, 2),
    `${visualSafety}.`,
    progressionLines[2],
    dialogue,
    `${camera}; ${negative}, 장면과 무관한 인물이나 소품을 추가하지 않고 얼굴·신체 비율·의상과 장면 간 시각적 연속성을 유지한다.`,
  ].filter(Boolean).join(' ');
}

export function createHiggsfieldPromptSourceKey(scene: Scene, context: PromptContext): string {
  const { higgsfieldPrompt: _prompt, higgsfieldPromptSourceKey: _sourceKey, ...sceneSource } = scene;
  const characters = context.characters.map(({ imageDataUrl, ...character }) => ({
    ...character,
    hasReferenceImage: Boolean(imageDataUrl),
  }));
  const source = JSON.stringify({ version: 2, scene: sceneSource, ...context, characters });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `hf-v2-${(hash >>> 0).toString(36)}`;
}
