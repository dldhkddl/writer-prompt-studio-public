import { getNextEpisodeIdAfterDeletion, removeEpisodeFromProject } from './project-updates';
import type { Project } from './types';

export type EpisodeDeletionResult = { deleted: boolean; episodeId: string; sceneId: string };

export function deleteEpisodeAndChooseNext(
  project: Project,
  episodeId: string,
  persistProject: (next: Project) => boolean,
): EpisodeDeletionResult {
  const current = project.episodes.find((episode) => episode.id === episodeId);
  if (!current) return { deleted: false, episodeId, sceneId: '' };
  const nextEpisodeId = getNextEpisodeIdAfterDeletion(project.episodes, episodeId) ?? '';
  const nextProject = removeEpisodeFromProject(project, episodeId);
  if (!persistProject(nextProject)) return { deleted: false, episodeId, sceneId: current.scenes[0]?.id ?? '' };
  const nextEpisode = nextProject.episodes.find((episode) => episode.id === nextEpisodeId);
  return { deleted: true, episodeId: nextEpisodeId, sceneId: nextEpisode?.scenes[0]?.id ?? '' };
}
