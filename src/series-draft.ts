import type { Character, Episode, Project, Relationship, Scene, SeriesEpisodeMeta, SeriesPlan, StoryBeat, TrendNote, World } from './types';

export type SeriesRequestCharacter = Omit<Character, 'imageDataUrl'> & { hasReferenceImage: boolean };
export type SeriesHistoryItem = Pick<Episode, 'id' | 'title' | 'idea' | 'logline' | 'ending' | 'nextHook' | 'characterIds'> & { seriesMeta: SeriesEpisodeMeta };
export type SeriesSourceEpisode = Pick<Episode, 'id' | 'title' | 'idea' | 'logline' | 'theme' | 'outerGoal' | 'innerNeed' | 'flaw' | 'obstacle' | 'stakes' | 'twist' | 'ending' | 'nextHook' | 'fullScript' | 'characterIds'> & {
  beats: Array<Pick<StoryBeat, 'kind' | 'content' | 'continuityOut'>>;
  scenes: Array<Pick<Scene, 'id' | 'title' | 'purpose' | 'emotionBefore' | 'emotionAfter' | 'action' | 'dialogue' | 'continuityIn' | 'continuityOut' | 'characterIds'>>;
};
export type SeriesProposalRequest = {
  series: Pick<SeriesPlan, 'premise' | 'protagonistId' | 'worldId' | 'comedyModes'>;
  characters: SeriesRequestCharacter[];
  world?: World;
  relationships: Relationship[];
  history: SeriesHistoryItem[];
  trends: TrendNote[];
  sourceEpisode?: SeriesSourceEpisode;
};

export function buildSeriesProposalRequest(project: Project): SeriesProposalRequest {
  const plan = project.seriesPlan;
  if (!plan) throw new Error('연재 설정을 먼저 만들어주세요.');
  const characters = project.characters.map(({ imageDataUrl, ...character }) => ({ ...character, hasReferenceImage: Boolean(imageDataUrl) }));
  const history = project.episodes
    .filter((episode): episode is Episode & { seriesMeta: SeriesEpisodeMeta } => Boolean(episode.seriesMeta))
    .sort((left, right) => left.seriesMeta.sequence - right.seriesMeta.sequence)
    .slice(-30)
    .map(({ id, title, idea, logline, ending, nextHook, characterIds, seriesMeta }) => ({
      id, title, idea, logline, ending, nextHook, characterIds: [...characterIds],
      seriesMeta: { ...seriesMeta, stateChanges: [...seriesMeta.stateChanges], openThreads: [...seriesMeta.openThreads], resolvedThreads: [...seriesMeta.resolvedThreads] },
    }));

  return {
    series: { premise: plan.premise, protagonistId: plan.protagonistId, ...(plan.worldId ? { worldId: plan.worldId } : {}), comedyModes: [...plan.comedyModes] },
    characters,
    world: project.worlds.find((world) => world.id === plan.worldId),
    relationships: project.relationships.map((relationship) => ({ ...relationship })),
    history,
    trends: project.trends.filter((trend) => {
      if (!trend.sourceUrl.trim() || Number.isNaN(Date.parse(trend.checkedAt))) return false;
      try { return ['http:', 'https:'].includes(new URL(trend.sourceUrl).protocol); } catch { return false; }
    }).map((trend) => ({ ...trend })),
  };
}

export function buildNextEpisodePlan(project: Project, sourceEpisode: Episode, now: string): SeriesPlan {
  const existing = project.seriesPlan;
  return {
    premise: sourceEpisode.nextHook?.trim() || sourceEpisode.ending?.trim() || sourceEpisode.idea.trim(),
    protagonistId: sourceEpisode.characterIds[0] ?? existing?.protagonistId ?? project.characters[0]?.id ?? '',
    ...(sourceEpisode.worldId ? { worldId: sourceEpisode.worldId } : existing?.worldId ? { worldId: existing.worldId } : {}),
    status: existing?.status ?? 'planning',
    comedyModes: existing?.comedyModes.length ? [...existing.comedyModes] : ['relatable', 'meme'],
    pendingProposals: [],
    sourceEpisodeId: sourceEpisode.id,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

const copySourceEpisode = (episode: Episode): SeriesSourceEpisode => ({
  id: episode.id,
  title: episode.title,
  idea: episode.idea,
  logline: episode.logline,
  theme: episode.theme,
  outerGoal: episode.outerGoal,
  innerNeed: episode.innerNeed,
  flaw: episode.flaw,
  obstacle: episode.obstacle,
  stakes: episode.stakes,
  twist: episode.twist,
  ending: episode.ending,
  nextHook: episode.nextHook,
  fullScript: episode.fullScript,
  characterIds: [...episode.characterIds],
  beats: (episode.beats ?? []).map(({ kind, content, continuityOut }) => ({ kind, content, continuityOut })),
  scenes: episode.scenes.map(({ id, title, purpose, emotionBefore, emotionAfter, action, dialogue, continuityIn, continuityOut, characterIds }) => ({
    id, title, purpose, emotionBefore, emotionAfter, action, dialogue, continuityIn, continuityOut,
    ...(characterIds ? { characterIds: [...characterIds] } : {}),
  })),
});

export function buildNextEpisodeProposalRequest(project: Project, sourceEpisode: Episode, plan: SeriesPlan): SeriesProposalRequest {
  return {
    ...buildSeriesProposalRequest({ ...project, seriesPlan: plan }),
    sourceEpisode: copySourceEpisode(sourceEpisode),
  };
}
