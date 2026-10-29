import type { Character, Episode, Project } from './types';

export function patchCharacterInProject(
  project: Project,
  characterId: string,
  patch: Partial<Character>,
): Project {
  return {
    ...project,
    characters: project.characters.map((character) => (
      character.id === characterId ? { ...character, ...patch } : character
    )),
  };
}

export function removeCharacterFromProject(project: Project, characterId: string): Project {
  if (!project.characters.some((character) => character.id === characterId)) return project;
  const remainingCharacters = project.characters.filter((character) => character.id !== characterId);
  const seriesPlan = project.seriesPlan
    ? {
        ...project.seriesPlan,
        protagonistId: project.seriesPlan.protagonistId === characterId
          ? remainingCharacters[0]?.id ?? ''
          : project.seriesPlan.protagonistId,
        pendingProposals: [],
      }
    : undefined;

  return {
    ...project,
    characters: remainingCharacters,
    ...(seriesPlan ? { seriesPlan } : {}),
    relationships: project.relationships.filter((relationship) => (
      relationship.fromCharacterId !== characterId && relationship.toCharacterId !== characterId
    )),
    episodes: project.episodes.map((episode) => ({
      ...episode,
      characterIds: episode.characterIds.filter((id) => id !== characterId),
      scenes: episode.scenes.map((scene) => ({
        ...scene,
        ...(scene.characterIds
          ? { characterIds: scene.characterIds.filter((id) => id !== characterId) }
          : {}),
      })),
    })),
  };
}

export function getNextCharacterIdAfterDeletion(
  characters: Character[],
  characterId: string,
): string | undefined {
  const deletedIndex = characters.findIndex((character) => character.id === characterId);
  if (deletedIndex < 0) return characters[0]?.id;
  return characters[deletedIndex + 1]?.id ?? characters[deletedIndex - 1]?.id;
}

export function removeEpisodeFromProject(project: Project, episodeId: string): Project {
  if (!project.episodes.some((episode) => episode.id === episodeId)) return project;
  return { ...project, episodes: project.episodes.filter((episode) => episode.id !== episodeId) };
}

export function getNextEpisodeIdAfterDeletion(episodes: Episode[], episodeId: string): string | undefined {
  const deletedIndex = episodes.findIndex((episode) => episode.id === episodeId);
  if (deletedIndex < 0) return episodes[0]?.id;
  return episodes[deletedIndex + 1]?.id ?? episodes[deletedIndex - 1]?.id;
}
