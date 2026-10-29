import type { Episode, Project, ReferenceAssetSuggestion, Scene, SceneReferenceAsset } from './types';

export const referenceAssetCategoryLabels = { environment: '공간', wardrobe: '의상', prop: '소품', screen: '화면' } as const;

export function createSceneReferenceAssets(suggestions: ReferenceAssetSuggestion[], idFactory: (index: number) => string = (index) => `참고이미지-${Date.now()}-${index + 1}`): SceneReferenceAsset[] {
  return suggestions.map((suggestion, index) => ({ ...suggestion, id: idFactory(index), status: 'proposed' }));
}

export type ExistingReferenceAssetMatch = { asset: SceneReferenceAsset; episodeTitle: string; sceneTitle: string };

const normalizeAssetKeyword = (keyword: string) => keyword.toLocaleLowerCase('ko-KR')
  .replace(/업무용|업무|화면|이미지|장면/gu, '')
  .replace(/[^\p{L}\p{N}]/gu, '');

const isSameAssetKeyword = (left: string, right: string) => {
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;
  return shorter.length >= 3 && longer.includes(shorter);
};

export function findExistingReferenceAssetMatch(project: Project, currentSceneId: string, target: SceneReferenceAsset): ExistingReferenceAssetMatch | undefined {
  const targetKeyword = normalizeAssetKeyword(target.keyword);
  if (!targetKeyword) return undefined;
  let unapprovedMatch: ExistingReferenceAssetMatch | undefined;
  for (const episode of project.episodes) {
    for (const scene of episode.scenes) {
      if (scene.id === currentSceneId) continue;
      for (const asset of scene.referenceAssets ?? []) {
        if (asset.category !== target.category || !isSameAssetKeyword(normalizeAssetKeyword(asset.keyword), targetKeyword)) continue;
        const match = { asset, episodeTitle: episode.title, sceneTitle: scene.title };
        if (asset.status === 'approved') return match;
        unapprovedMatch ??= match;
      }
    }
  }
  return unapprovedMatch;
}

export function buildApprovedReferenceAssetRules(assets: SceneReferenceAsset[] = []): string {
  const approved = assets.filter((asset) => asset.status === 'approved');
  if (!approved.length) return '';
  const list = approved.map((asset) => `${asset.category === 'screen' ? `@screen: ${asset.keyword}` : asset.keyword}(${referenceAssetCategoryLabels[asset.category]}) — ${asset.imagePrompt}`).join('; ');
  const screenRule = approved.some((asset) => asset.category === 'screen')
    ? ' 승인된 화면 이미지는 Higgsfield에 @screen으로 첨부하고 화면 내용을 새로 생성하지 말고 원본 그대로 합성한다.'
    : '';
  return `승인된 참고 이미지만 장면의 시각 기준으로 첨부한다: ${list}. 승인되지 않은 제안은 사용하지 않는다. 각 참고 이미지의 외형·색상·재질·구조와 소품 배치를 장면 전체에서 유지한다.${screenRule}`;
}

export function buildReferenceAssetRequest(project: Project, episode: Episode, scene: Scene) {
  const castIds = new Set(scene.characterIds ?? episode.characterIds);
  const world = project.worlds.find((item) => item.id === episode.worldId);
  return {
    episode: { id: episode.id, title: episode.title },
    scene: { id: scene.id, title: scene.title, purpose: scene.purpose ?? '', action: scene.action, dialogue: scene.dialogue, camera: scene.camera, mood: scene.mood, continuityIn: scene.continuityIn ?? '', continuityOut: scene.continuityOut ?? '' },
    characters: project.characters.filter((character) => castIds.has(character.id)).map((character) => ({
      id: character.id, name: character.name, type: character.type, appearance: character.appearance,
      behaviorStyle: character.behaviorStyle ?? 'humanlike', hasReferenceImage: Boolean(character.imageDataUrl),
    })),
    ...(world ? { world } : {}),
  };
}
