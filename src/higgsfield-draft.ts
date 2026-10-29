import type { Character, Episode, Project, Relationship, Scene, World } from './types';

export type HiggsfieldPromptCharacter = Omit<Character, 'imageDataUrl'> & { hasReferenceImage: boolean };
type HiggsfieldSceneInput = Omit<Scene, 'higgsfieldPrompt' | 'higgsfieldPromptSourceKey'>;
export type HiggsfieldPromptRequest = {
  episode: Pick<Episode, 'id' | 'title' | 'logline' | 'theme' | 'outerGoal' | 'obstacle'>;
  scene: HiggsfieldSceneInput;
  previousScene?: HiggsfieldSceneInput;
  characters: HiggsfieldPromptCharacter[];
  world?: World;
  relationships: Relationship[];
};

export function buildHiggsfieldDraftRequest(project: Project, episode: Episode, scene: Scene): HiggsfieldPromptRequest {
  const castIds = new Set(scene.characterIds ?? episode.characterIds);
  const characters = project.characters.filter((character) => castIds.has(character.id)).map(({ imageDataUrl, ...character }) => ({
    ...character,
    hasReferenceImage: Boolean(imageDataUrl),
  }));
  const { higgsfieldPrompt: _prompt, higgsfieldPromptSourceKey: _sourceKey, ...rawSceneRequest } = scene;
  const sceneIndex = episode.scenes.findIndex((candidate) => candidate.id === scene.id);
  const previousScene = sceneIndex > 0 ? episode.scenes[sceneIndex - 1] : undefined;
  const previousSceneRequest = previousScene
    ? (({ higgsfieldPrompt: _previousPrompt, higgsfieldPromptSourceKey: _previousSourceKey, ...rest }) => rest)(previousScene)
    : undefined;
  const { timeRange: _timeRange, ...sceneWithoutTechnicalSettings } = rawSceneRequest;
  const sceneRequest = {
    ...sceneWithoutTechnicalSettings,
    ...(previousSceneRequest ? { continuityIn: previousSceneRequest.continuityOut?.trim() || previousSceneRequest.action } : {}),
  };
  return {
    episode: {
      id: episode.id,
      title: episode.title,
      logline: episode.logline,
      theme: episode.theme,
      outerGoal: episode.outerGoal,
      obstacle: episode.obstacle,
    },
    scene: sceneRequest,
    ...(previousSceneRequest ? { previousScene: previousSceneRequest } : {}),
    characters,
    world: project.worlds.find((world) => world.id === episode.worldId),
    relationships: project.relationships.filter((relationship) => castIds.has(relationship.fromCharacterId) && castIds.has(relationship.toCharacterId)),
  };
}
