import type { Scene } from './types';

export function patchSceneAndInvalidateFollowing(scenes: Scene[], sceneId: string, patch: Partial<Scene>): Scene[] {
  const changedIndex = scenes.findIndex((scene) => scene.id === sceneId);
  if (changedIndex < 0) return scenes;
  const carriesApprovedPrompt = Object.prototype.hasOwnProperty.call(patch, 'higgsfieldPrompt')
    || Object.prototype.hasOwnProperty.call(patch, 'higgsfieldPromptSourceKey');
  if (carriesApprovedPrompt) return scenes.map((scene) => scene.id === sceneId ? { ...scene, ...patch } : scene);

  return scenes.map((scene, index) => {
    if (index < changedIndex) return scene;
    if (index === changedIndex) {
      const changed = { ...scene, ...patch };
      const { higgsfieldPrompt: _prompt, higgsfieldPromptSourceKey: _sourceKey, ...withoutPrompt } = changed;
      return withoutPrompt;
    }
    const { higgsfieldPrompt: _prompt, higgsfieldPromptSourceKey: _sourceKey, ...withoutPrompt } = scene;
    if (index === changedIndex + 1 && typeof patch.continuityOut === 'string') {
      return { ...withoutPrompt, continuityIn: patch.continuityOut };
    }
    return withoutPrompt;
  });
}

export function moveSceneAndInvalidateFollowing(scenes: Scene[], sceneId: string, direction: -1 | 1): Scene[] {
  const currentIndex = scenes.findIndex((scene) => scene.id === sceneId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= scenes.length) return scenes;
  const moved = [...scenes];
  [moved[currentIndex], moved[nextIndex]] = [moved[nextIndex], moved[currentIndex]];
  const affectedIndex = Math.min(currentIndex, nextIndex);

  return moved.map((scene, index) => {
    if (index < affectedIndex) return scene;
    const { higgsfieldPrompt: _prompt, higgsfieldPromptSourceKey: _sourceKey, ...withoutPrompt } = scene;
    if (index === 0) return { ...withoutPrompt, continuityIn: '에피소드 시작 상태에서 장면을 연다' };
    const previous = moved[index - 1];
    return { ...withoutPrompt, continuityIn: previous.continuityOut?.trim() || previous.action };
  });
}
