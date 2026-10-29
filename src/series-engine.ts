import { beatsToScenes, createDefaultBeats } from './story-structure';
import type { Episode, Project } from './types';

export type SeriesApprovalResult = { project: Project; episodeId: string; sceneId: string };

export function approveSeriesProposal(project: Project, proposalId: string, now: string): SeriesApprovalResult {
  const plan = project.seriesPlan;
  const proposal = plan?.pendingProposals.find((candidate) => candidate.id === proposalId);
  if (!plan || !proposal) throw new Error('승인할 연재 후보를 찾지 못했습니다.');
  const characterIds = new Set(project.characters.map((character) => character.id));
  if (!characterIds.has(plan.protagonistId) || !proposal.characterIds.includes(plan.protagonistId) || proposal.characterIds.some((id) => !characterIds.has(id))) {
    throw new Error('삭제되었거나 존재하지 않는 캐릭터가 포함된 연재 후보입니다. 다시 제안받아 주세요.');
  }
  const targetWorldId = proposal.worldId ?? plan.worldId;
  if (targetWorldId && !project.worlds.some((world) => world.id === targetWorldId)) {
    throw new Error('삭제되었거나 존재하지 않는 세계관이 포함된 연재 후보입니다. 다시 제안받아 주세요.');
  }
  const verifiedTrendIds = new Set(project.trends
    .filter((trend) => {
      if (!trend.sourceUrl.trim() || Number.isNaN(Date.parse(trend.checkedAt))) return false;
      try { return ['http:', 'https:'].includes(new URL(trend.sourceUrl).protocol); } catch { return false; }
    })
    .map((trend) => trend.id));
  if (proposal.trendIds.some((id) => !verifiedTrendIds.has(id))) {
    throw new Error('출처가 확인되지 않은 트렌드가 포함된 연재 후보입니다. 다시 제안받아 주세요.');
  }

  const beats = createDefaultBeats().map((definition) => {
    const proposed = proposal.beats.find((beat) => beat.kind === definition.kind);
    if (!proposed) throw new Error('연재 후보의 7개 장면 구성이 올바르지 않습니다.');
    return { ...definition, content: proposed.content, continuityOut: proposed.continuityOut };
  });
  const scenes = beatsToScenes(beats, proposal.characterIds);
  const sequence = Math.max(0, ...project.episodes.map((episode) => episode.seriesMeta?.sequence ?? 0)) + 1;
  const episodeId = `에피소드-${proposal.id}-${sequence}`;
  const episode: Episode = {
    id: episodeId,
    title: proposal.title,
    idea: proposal.idea,
    worldId: proposal.worldId ?? plan.worldId,
    characterIds: [...proposal.characterIds],
    scenes,
    beats,
    status: 'draft',
    updatedAt: now,
    logline: proposal.logline,
    theme: proposal.theme,
    outerGoal: proposal.outerGoal,
    innerNeed: proposal.innerNeed,
    flaw: proposal.flaw,
    obstacle: proposal.obstacle,
    stakes: proposal.stakes,
    twist: proposal.twist,
    ending: proposal.ending,
    nextHook: proposal.nextHook,
    seriesMeta: {
      sequence,
      category: proposal.category,
      comedyMode: proposal.comedyMode,
      whyNow: proposal.whyNow,
      stateChanges: [...proposal.stateChanges],
      openThreads: [...proposal.openThreads],
      resolvedThreads: [...proposal.resolvedThreads],
      sourceProposalId: proposal.id,
    },
  };

  return {
    project: {
      ...project,
      episodes: [...project.episodes, episode],
      seriesPlan: { ...plan, status: 'running', pendingProposals: [], updatedAt: now },
    },
    episodeId,
    sceneId: scenes[0]?.id ?? '',
  };
}
