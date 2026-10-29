import { describe, expect, it } from 'vitest';
import { buildApprovedReferenceAssetRules, createSceneReferenceAssets, findExistingReferenceAssetMatch } from './reference-assets';
import type { Project, SceneReferenceAsset } from './types';

const suggestions = [
  { keyword: '면접 부스', category: 'environment' as const, reason: '공간 기준', imagePrompt: '현실적인 면접 부스', priority: 'required' as const },
  { keyword: '노트북', category: 'prop' as const, reason: '핵심 소품', imagePrompt: '은색 노트북', priority: 'required' as const },
  { keyword: '입장 화면', category: 'screen' as const, reason: '행동 기준', imagePrompt: '화상 면접 대기 화면', priority: 'optional' as const },
];

describe('장면 필요 이미지 상태', () => {
  it('Sol 제안을 승인 전 카드로 바꾼다', () => {
    const assets = createSceneReferenceAssets(suggestions, (index) => `asset-${index + 1}`);
    expect(assets).toHaveLength(3);
    expect(assets[0]).toEqual({ ...suggestions[0], id: 'asset-1', status: 'proposed' });
  });

  it('승인한 항목만 힉스필드 참고 이미지 지시로 만든다', () => {
    const assets = createSceneReferenceAssets(suggestions, (index) => `asset-${index + 1}`);
    const rules = buildApprovedReferenceAssetRules([
      { ...assets[0], status: 'approved' }, assets[1], { ...assets[2], status: 'approved' },
    ]);
    expect(rules).toContain('면접 부스');
    expect(rules).toContain('입장 화면');
    expect(rules).toContain('@screen');
    expect(rules).not.toContain('노트북');
    expect(rules).toContain('승인된 참고 이미지만');
  });

  it('다른 장면의 노트북을 업무용 노트북 제안의 기존 후보로 찾는다', () => {
    const approvedLaptop: SceneReferenceAsset = { ...suggestions[1], id: '기존-노트북', status: 'proposed' };
    const targetLaptop: SceneReferenceAsset = { ...suggestions[1], keyword: '업무용 노트북', id: '새-노트북', status: 'proposed' };
    const project = {
      characters: [], worlds: [], relationships: [], trends: [],
      episodes: [
        { id: 'e0', title: '첫 출근', idea: '', characterIds: [], status: 'draft', updatedAt: '', scenes: [{ id: 's0', title: '업무 시작', action: '', dialogue: '', camera: '', mood: '', negativePrompt: '', referenceAssets: [approvedLaptop] }] },
      ],
    } as Project;

    expect(findExistingReferenceAssetMatch(project, '현재-장면', targetLaptop)).toEqual({
      asset: approvedLaptop,
      episodeTitle: '첫 출근',
      sceneTitle: '업무 시작',
    });
  });

  it('현재 장면에만 있거나 분류가 다른 이미지는 기존 후보로 사용하지 않는다', () => {
    const wardrobeLaptop: SceneReferenceAsset = { ...suggestions[1], category: 'wardrobe', id: '제안-노트북', status: 'proposed' };
    const targetLaptop: SceneReferenceAsset = { ...suggestions[1], id: '새-노트북', status: 'proposed' };
    const project = {
      characters: [], worlds: [], relationships: [], trends: [],
      episodes: [
        { id: 'e0', title: '현재 화', idea: '', characterIds: [], status: 'draft', updatedAt: '', scenes: [{ id: '현재-장면', title: '현재 장면', action: '', dialogue: '', camera: '', mood: '', negativePrompt: '', referenceAssets: [{ ...targetLaptop, status: 'approved' }] }] },
        { id: 'e1', title: '다른 화', idea: '', characterIds: [], status: 'draft', updatedAt: '', scenes: [{ id: 's1', title: '다른 장면', action: '', dialogue: '', camera: '', mood: '', negativePrompt: '', referenceAssets: [wardrobeLaptop] }] },
      ],
    } as Project;

    expect(findExistingReferenceAssetMatch(project, '현재-장면', targetLaptop)).toBeUndefined();
  });
});
