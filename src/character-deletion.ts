import { removeCharacterFromProject } from './project-updates';
import type { Project } from './types';

type CharacterDeletionOptions = {
  project: Project;
  characterId: string;
  persistProject: (project: Project) => boolean;
  deleteImage: (characterId: string) => Promise<void>;
  onImageCleanupError: () => void;
};

export function scheduleCharacterDeletion({
  project,
  characterId,
  persistProject,
  deleteImage,
  onImageCleanupError,
}: CharacterDeletionOptions): boolean {
  const next = removeCharacterFromProject(project, characterId);
  if (next === project || !persistProject(next)) return false;

  void deleteImage(characterId).catch(onImageCleanupError);
  return true;
}
