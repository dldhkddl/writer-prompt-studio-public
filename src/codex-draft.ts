import type { BeatKind, Character, Episode, Project, Relationship, World } from './types';

export const codexStoryFields = ['logline', 'theme', 'outerGoal', 'innerNeed', 'flaw', 'obstacle', 'stakes', 'twist', 'ending', 'nextHook'] as const;
export type CodexStoryField = typeof codexStoryFields[number];
export type CodexDraftBeat = { kind: BeatKind; content: string; continuityOut: string };
export type CodexStoryDraft = Partial<Record<CodexStoryField, string>> & { beats: CodexDraftBeat[]; editorNotes: string[] };
export type CodexCharacter = Omit<Character, 'imageDataUrl'>;
export type CodexStoryHistoryEntry = { id: string; title: string; idea: string; logline?: string; twist?: string; ending?: string };
export type CodexStoryAvoid = { fullScript?: string; logline?: string; twist?: string; ending?: string; beats?: string[] };
export type CodexStoryRequest = {
  episode: Pick<Episode, 'id' | 'title' | 'idea' | 'logline' | 'theme' | 'outerGoal' | 'innerNeed' | 'flaw' | 'obstacle' | 'stakes' | 'twist' | 'ending' | 'nextHook' | 'beats'>;
  characters: CodexCharacter[];
  world?: World;
  relationships: Relationship[];
  history?: CodexStoryHistoryEntry[];
  avoid?: CodexStoryAvoid;
};

const MAX_STORY_HISTORY = 8;
const filled = (value?: string) => Boolean(value?.trim());

export function buildStoryHistory(project: Project, episode: Episode): CodexStoryHistoryEntry[] {
  return project.episodes
    .filter((item) => item.id !== episode.id)
    .filter((item) => !episode.worldId || !item.worldId || item.worldId === episode.worldId)
    .filter((item) => filled(item.title) || filled(item.idea) || filled(item.logline) || filled(item.ending))
    .slice()
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .slice(0, MAX_STORY_HISTORY)
    .map((item) => ({
      id: item.id,
      title: item.title,
      idea: item.idea,
      ...(filled(item.logline) ? { logline: item.logline } : {}),
      ...(filled(item.twist) ? { twist: item.twist } : {}),
      ...(filled(item.ending) ? { ending: item.ending } : {}),
    }));
}

export function buildEpisodeAvoid(episode: Episode): CodexStoryAvoid | undefined {
  const beats = (episode.beats ?? []).map((beat) => beat.content.trim()).filter(Boolean);
  const avoid: CodexStoryAvoid = {
    ...(filled(episode.fullScript) ? { fullScript: episode.fullScript!.trim() } : {}),
    ...(filled(episode.logline) ? { logline: episode.logline!.trim() } : {}),
    ...(filled(episode.twist) ? { twist: episode.twist!.trim() } : {}),
    ...(filled(episode.ending) ? { ending: episode.ending!.trim() } : {}),
    ...(beats.length ? { beats } : {}),
  };
  return Object.keys(avoid).length ? avoid : undefined;
}

export function buildCodexStoryRequest(project: Project, episode: Episode): CodexStoryRequest {
  const cast = new Set(episode.characterIds);
  const history = buildStoryHistory(project, episode);
  return {
    episode: Object.fromEntries(['id', 'title', 'idea', ...codexStoryFields, 'beats'].map((key) => [key, episode[key as keyof Episode]])) as CodexStoryRequest['episode'],
    characters: project.characters.filter((character) => cast.has(character.id)).map(({ imageDataUrl: _imageDataUrl, ...character }) => character),
    world: project.worlds.find((world) => world.id === episode.worldId),
    relationships: project.relationships.filter((relationship) => cast.has(relationship.fromCharacterId) && cast.has(relationship.toCharacterId)),
    ...(history.length ? { history } : {}),
  };
}

export function buildIdeaFirstStoryRequest(project: Project, episode: Episode): CodexStoryRequest {
  const request = buildCodexStoryRequest(project, episode);
  const avoid = buildEpisodeAvoid(episode);
  return {
    ...request,
    episode: { id: episode.id, title: episode.title, idea: episode.idea },
    ...(avoid ? { avoid } : {}),
  };
}

export function applyCodexDraft(episode: Episode, draft: Partial<CodexStoryDraft>): Episode {
  const next: Episode = { ...episode };
  for (const field of codexStoryFields) {
    if (typeof draft[field] === 'string' && draft[field].trim()) next[field] = draft[field];
  }
  if (draft.beats && episode.beats) {
    const draftByKind = new Map(draft.beats.filter((beat) => beat.content.trim()).map((beat) => [beat.kind, beat]));
    next.beats = episode.beats.map((beat) => {
      const proposed = draftByKind.get(beat.kind);
      return proposed ? { ...beat, content: proposed.content, continuityOut: proposed.continuityOut?.trim() || beat.continuityOut } : beat;
    });
  }
  return next;
}

export function applyCodexField(episode: Episode, draft: CodexStoryDraft, field: CodexStoryField | 'beats'): Episode {
  if (field === 'beats') return applyCodexDraft(episode, { beats: draft.beats });
  return applyCodexDraft(episode, { [field]: draft[field] });
}
