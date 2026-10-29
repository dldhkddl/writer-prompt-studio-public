import { sampleProject } from './sample-data';
import { createDefaultBeats } from './story-structure';
import type { Project } from './types';

const STORAGE_KEY = '작가-프롬프트-스튜디오-프로젝트';
const RECOVERY_KEY = '작가-프롬프트-스튜디오-복구본';
const LEGACY_DOG_DIALOGUE_RULE = '사람들은 강아지의 말을 알아듣지 못한다';
const DOG_DAILY_LIFE_RULES = [
  '사람과 강아지는 서로의 말을 자연스럽게 알아듣고 대화한다',
  '강아지 캐릭터는 사람처럼 두 발로 걷고 물건을 사용하며 일할 수 있다',
];
const SERIES_PROPOSAL_TEXT_FIELDS = ['id', 'title', 'category', 'comedyMode', 'idea', 'logline', 'theme', 'outerGoal', 'innerNeed', 'flaw', 'obstacle', 'stakes', 'twist', 'ending', 'nextHook', 'whyNow'] as const;
const SERIES_FUN_FIELDS = ['setup', 'escalation', 'reversal', 'visualGag', 'payoff', 'funReason'] as const;
const SERIES_BEAT_KINDS = new Set(['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next']);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');

function isValidSeriesProposal(value: unknown): boolean {
  if (!isRecord(value) || !SERIES_PROPOSAL_TEXT_FIELDS.every((field) => typeof value[field] === 'string')) return false;
  if (value.comedyMode !== 'relatable' && value.comedyMode !== 'meme') return false;
  if (!isStringArray(value.stateChanges) || !isStringArray(value.openThreads) || !isStringArray(value.resolvedThreads) || !isStringArray(value.characterIds) || !isStringArray(value.trendIds)) return false;
  const fun = value.fun;
  if (!isRecord(fun) || !SERIES_FUN_FIELDS.every((field) => typeof fun[field] === 'string')) return false;
  if (!Array.isArray(value.beats) || value.beats.length !== 7) return false;
  const kinds = new Set<string>();
  for (const beat of value.beats) {
    if (!isRecord(beat) || typeof beat.kind !== 'string' || !SERIES_BEAT_KINDS.has(beat.kind) || typeof beat.content !== 'string' || typeof beat.continuityOut !== 'string') return false;
    kinds.add(beat.kind);
  }
  return kinds.size === 7;
}

function assertValidSeriesData(project: Project): void {
  const plan: unknown = project.seriesPlan;
  if (plan !== undefined) {
    if (!isRecord(plan)) throw new Error('연재 설정 데이터가 올바르지 않습니다.');
    const pending = plan.pendingProposals;
    if (pending !== undefined && (!Array.isArray(pending) || !pending.every(isValidSeriesProposal))) throw new Error('연재 후보 데이터가 손상되었습니다.');
  }
  for (const episode of project.episodes) {
    const meta: unknown = episode.seriesMeta;
    if (meta === undefined) continue;
    if (!isRecord(meta) || !Number.isInteger(meta.sequence) || (meta.comedyMode !== 'relatable' && meta.comedyMode !== 'meme')
      || !isStringArray(meta.stateChanges) || !isStringArray(meta.openThreads) || !isStringArray(meta.resolvedThreads)
      || typeof meta.category !== 'string' || typeof meta.whyNow !== 'string' || typeof meta.sourceProposalId !== 'string') {
      throw new Error('연재 시간선 데이터가 손상되었습니다.');
    }
  }
}

export type SaveResult = { ok: true } | { ok: false; message: string };
export type LoadResult = { project: Project; recoveryRaw?: string; warning?: string };

export function serializeProject(project: Project, options: { preserveImages?: boolean } = {}): string {
  if (options.preserveImages) return JSON.stringify(project);
  return JSON.stringify({ ...project, characters: project.characters.map(({ imageDataUrl: _imageDataUrl, ...character }) => character) });
}

export function parseProjectJson(raw: string): Project {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error('저장 데이터 구조가 올바르지 않습니다.');
  const candidate = parsed as Partial<Project>;
  const arrays = [candidate.characters, candidate.worlds, candidate.relationships, candidate.episodes, candidate.trends];
  if (arrays.some((value) => !Array.isArray(value))) throw new Error('저장 데이터 구조가 올바르지 않습니다.');
  return normalizeProject(candidate as Project);
}

export function saveProject(project: Project, options: { preserveImages?: boolean } = {}): SaveResult {
  if (typeof window === 'undefined') return { ok: true };
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeProject(project, options));
    return { ok: true };
  } catch {
    return { ok: false, message: '브라우저 저장 공간이 부족해 변경 내용을 저장하지 못했습니다.' };
  }
}

export function normalizeProject(project: Project): Project {
  assertValidSeriesData(project);
  return {
    ...project,
    characters: project.characters.map((character) => ({
      ...character,
      gender: ['female', 'male', 'neutral', 'unspecified'].includes(character.gender ?? '') ? character.gender : 'unspecified',
      behaviorStyle: ['humanlike', 'animal', 'mixed'].includes(character.behaviorStyle ?? '') ? character.behaviorStyle : 'humanlike',
    })),
    ...(project.seriesPlan ? {
      seriesPlan: {
        ...project.seriesPlan,
        comedyModes: (() => {
          const modes = Array.isArray(project.seriesPlan.comedyModes)
            ? project.seriesPlan.comedyModes.filter((mode) => mode === 'relatable' || mode === 'meme')
            : [];
          return modes.length ? modes : ['relatable'];
        })(),
        pendingProposals: Array.isArray(project.seriesPlan.pendingProposals) ? project.seriesPlan.pendingProposals : [],
      },
    } : {}),
    worlds: project.worlds.map((world) => {
      if (!world.rules.some((rule) => rule.trim() === LEGACY_DOG_DIALOGUE_RULE)) return world;
      const rules = world.rules.filter((rule) => rule.trim() !== LEGACY_DOG_DIALOGUE_RULE);
      for (const rule of DOG_DAILY_LIFE_RULES) if (!rules.includes(rule)) rules.push(rule);
      return { ...world, rules };
    }),
    episodes: project.episodes.map((episode) => {
      const beats = (episode.beats?.length ? episode.beats : createDefaultBeats()).map((beat, index) => ({
        ...beat,
        timeRange: '8초',
        continuityOut: beat.continuityOut?.trim() || episode.scenes[index]?.continuityOut?.trim() || '',
      }));
      const scenes = episode.scenes.map((scene, index) => ({
        ...scene,
        timeRange: '8초',
        continuityIn: scene.continuityIn?.trim() || (index === 0
          ? '에피소드 시작 상태에서 장면을 연다'
          : episode.scenes[index - 1].continuityOut?.trim() || `이전 장면의 마지막 위치·자세·소품·감정을 그대로 이어받는다: ${episode.scenes[index - 1].action}`),
        continuityOut: scene.continuityOut?.trim() || `다음 장면이 이어받을 마지막 위치·자세·소품·감정: ${scene.action}`,
      }));
      return {
      ...episode,
      logline: episode.logline ?? '',
      theme: episode.theme ?? '',
      outerGoal: episode.outerGoal ?? '',
      innerNeed: episode.innerNeed ?? '',
      flaw: episode.flaw ?? '',
      obstacle: episode.obstacle ?? '',
      stakes: episode.stakes ?? '',
      twist: episode.twist ?? '',
      ending: episode.ending ?? '',
      nextHook: episode.nextHook ?? '',
      fullScript: episode.fullScript ?? '',
      beats,
      scenes,
    };
    }),
  };
}

export function loadProjectState(): LoadResult {
  if (typeof window === 'undefined') return { project: normalizeProject(sampleProject) };
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return { project: saved ? parseProjectJson(saved) : normalizeProject(sampleProject) };
  } catch {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) try { window.localStorage.setItem(RECOVERY_KEY, raw); } catch { /* 원본 저장값은 그대로 유지한다. */ }
    return { project: normalizeProject(sampleProject), recoveryRaw: raw ?? undefined, warning: '저장 데이터가 손상되어 샘플 프로젝트를 열었습니다. 원본 복구본을 먼저 내려받아 보관하세요.' };
  }
}

export function loadProject(): Project {
  return loadProjectState().project;
}

export function resetProject(): Project {
  const normalized = normalizeProject(sampleProject);
  saveProject(normalized);
  return normalized;
}
