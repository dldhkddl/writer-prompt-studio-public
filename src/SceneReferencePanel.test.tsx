// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SceneReferencePanel from './SceneReferencePanel';
import type { Episode, Project, Scene, SceneReferenceAsset } from './types';

const mocks = vi.hoisted(() => ({
  getCodexStatus: vi.fn(), requestSuggestions: vi.fn(), requestImage: vi.fn(),
  saveImage: vi.fn(), loadImage: vi.fn(), deleteImage: vi.fn(), writeClipboard: vi.fn(),
}));
vi.mock('./codex-client', () => ({ getCodexStatus: mocks.getCodexStatus }));
vi.mock('./reference-assets-client', () => ({ requestReferenceAssetSuggestions: mocks.requestSuggestions }));
vi.mock('./reference-image-client', () => ({ requestReferenceImage: mocks.requestImage }));
vi.mock('./image-store', () => ({
  saveReferenceAssetImage: mocks.saveImage,
  loadReferenceAssetImage: mocks.loadImage,
  deleteReferenceAssetImage: mocks.deleteImage,
}));

const scene: Scene = { id: 's1', title: '온라인 면접', action: '노트북의 입장 버튼을 누른다', dialogue: '', camera: '', mood: '', negativePrompt: '' };
const episode: Episode = { id: 'e1', title: '첫 면접', idea: '', characterIds: ['c1'], scenes: [scene], status: 'draft', updatedAt: '' };
const project: Project = { characters: [{ id: 'c1', name: '줄리아', type: 'animal', imageDataUrl: 'data:image/png;base64,x', appearance: '검은색 시바견', personality: '', voice: '', habits: '', likes: '', dislikes: '' }], worlds: [], relationships: [], episodes: [episode], trends: [] };
const suggestions = [
  { keyword: '면접 부스', category: 'environment', reason: '공간 기준', imagePrompt: '현실적인 면접 부스, 인물과 글자 없음', priority: 'required' },
  { keyword: '노트북', category: 'prop', reason: '핵심 소품', imagePrompt: '은색 노트북, 로고 없음', priority: 'required' },
  { keyword: '입장 화면', category: 'screen', reason: '행동 기준', imagePrompt: '화상 면접 대기 화면, 글자 없음', priority: 'optional' },
];

let root: Root | undefined;
function renderPanel(overrides: Partial<{ project: Project; episode: Episode; scene: Scene }> = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const onUpdateScene = vi.fn();
  const renderedProject = overrides.project ?? project;
  const renderedEpisode = overrides.episode ?? episode;
  const renderedScene = overrides.scene ?? scene;
  root = createRoot(container);
  act(() => root?.render(<SceneReferencePanel project={renderedProject} episode={renderedEpisode} scene={renderedScene} onUpdateScene={onUpdateScene} />));
  return { container, onUpdateScene };
}
const button = (container: HTMLElement, label: string) => [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(label)) as HTMLButtonElement;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.getCodexStatus.mockReset().mockResolvedValue({ available: true, authenticated: true, message: '연결됨', requestToken: 'token' });
  mocks.requestSuggestions.mockReset().mockResolvedValue({ assets: suggestions });
  mocks.requestImage.mockReset().mockResolvedValue({ imageDataUrl: 'data:image/png;base64,QUJDRA==', mimeType: 'image/png', model: 'gpt-image-2' });
  mocks.saveImage.mockReset().mockResolvedValue(undefined);
  mocks.loadImage.mockReset().mockResolvedValue(undefined);
  mocks.deleteImage.mockReset().mockResolvedValue(undefined);
  mocks.writeClipboard.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: mocks.writeClipboard } });
  vi.stubGlobal('FileReader', class {
    result = 'data:image/png;base64,SU1QT1JU';
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    readAsDataURL() { this.onload?.(); }
  });
});
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; document.body.innerHTML = ''; vi.unstubAllGlobals(); });

describe('장면 필요 이미지 제안 패널', () => {
  it('기존 캐릭터 사진은 자동 사용으로 표시하고 Sol이 필요한 이미지를 항목별로 제안한다', async () => {
    const { container, onUpdateScene } = renderPanel();
    expect(container.textContent).toContain('줄리아 기준 사진 자동 사용');

    await act(async () => { button(container, '필요 이미지 찾기').click(); await Promise.resolve(); await Promise.resolve(); });

    expect(container.textContent).toContain('면접 부스');
    expect(container.textContent).toContain('노트북');
    expect(container.textContent).toContain('입장 화면');
    expect(container.textContent).toContain('현실적인 면접 부스');
    expect(onUpdateScene).toHaveBeenCalledWith({ referenceAssets: expect.arrayContaining([expect.objectContaining({ keyword: '면접 부스', status: 'proposed' })]) });
  });

  it('GPT 이미지 생성 버튼과 수동 불러오기 선택을 함께 제공한다', async () => {
    const { container } = renderPanel();
    await act(async () => { button(container, '필요 이미지 찾기').click(); await Promise.resolve(); await Promise.resolve(); });
    expect(button(container, '이 이미지 승인')).toBeUndefined();
    expect(container.textContent).toContain('GPT로 이미지 생성');
    expect(container.textContent).toContain('Codex 이미지 요청 복사');
    expect(container.textContent).toContain('생성 이미지 불러오기');
  });

  it('GPT 이미지 API 결과를 카드에 즉시 저장하고 미리보기한 뒤 승인한다', async () => {
    const { container, onUpdateScene } = renderPanel();
    await act(async () => { button(container, '필요 이미지 찾기').click(); await Promise.resolve(); await Promise.resolve(); });

    await act(async () => { button(container, 'GPT로 이미지 생성').click(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

    expect(mocks.requestImage).toHaveBeenCalledWith(expect.objectContaining({
      keyword: '면접 부스', imagePrompt: '현실적인 면접 부스, 인물과 글자 없음', sceneTitle: '온라인 면접',
    }), 'token', expect.any(AbortSignal));
    expect(mocks.saveImage).toHaveBeenCalledWith(expect.any(String), 'data:image/png;base64,QUJDRA==');
    expect(container.querySelector('img[alt="면접 부스 생성 이미지"]')).not.toBeNull();
    expect(onUpdateScene).not.toHaveBeenCalledWith({ referenceAssets: expect.arrayContaining([expect.objectContaining({ keyword: '면접 부스', status: 'approved' })]) });

    act(() => button(container, '이 이미지 승인').click());
    expect(onUpdateScene).toHaveBeenLastCalledWith({ referenceAssets: expect.arrayContaining([expect.objectContaining({ keyword: '면접 부스', status: 'approved' })]) });
  });

  it('장면과 이미지 항목을 포함한 Codex 이미지 생성 요청을 복사한다', async () => {
    const { container } = renderPanel();
    await act(async () => { button(container, '필요 이미지 찾기').click(); await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { button(container, 'Codex 이미지 요청 복사').click(); await Promise.resolve(); });

    expect(mocks.writeClipboard).toHaveBeenCalledWith(expect.stringContaining('장면: 온라인 면접'));
    expect(mocks.writeClipboard).toHaveBeenCalledWith(expect.stringContaining('항목: 면접 부스'));
    expect(mocks.writeClipboard).toHaveBeenCalledWith(expect.stringContaining('현실적인 면접 부스, 인물과 글자 없음'));
    expect(mocks.requestImage).not.toHaveBeenCalled();
  });

  it('Codex에서 내려받은 이미지를 카드에 불러와 미리보고 승인할 수 있다', async () => {
    const { container, onUpdateScene } = renderPanel();
    await act(async () => { button(container, '필요 이미지 찾기').click(); await Promise.resolve(); await Promise.resolve(); });
    const input = container.querySelector('input[aria-label="면접 부스 생성 이미지 불러오기"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['image'], '면접-부스.png', { type: 'image/png' })] });

    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });

    expect(mocks.saveImage).toHaveBeenCalledWith(expect.any(String), 'data:image/png;base64,SU1QT1JU');
    expect((container.querySelector('img[alt="면접 부스 생성 이미지"]') as HTMLImageElement)?.src).toBe('data:image/png;base64,SU1QT1JU');
    act(() => button(container, '이 이미지 승인').click());
    expect(onUpdateScene).toHaveBeenLastCalledWith({ referenceAssets: expect.arrayContaining([expect.objectContaining({ keyword: '면접 부스', status: 'approved' })]) });
  });

  it('화면 항목은 캐릭터가 없는 완성 화면 UI 생성 요청으로 복사한다', async () => {
    const { container } = renderPanel();
    await act(async () => { button(container, '필요 이미지 찾기').click(); await Promise.resolve(); await Promise.resolve(); });
    const screenCard = [...container.querySelectorAll('article')].find((item) => item.textContent?.includes('입장 화면')) as HTMLElement;
    await act(async () => { button(screenCard, 'Codex 이미지 요청 복사').click(); await Promise.resolve(); });

    expect(mocks.writeClipboard).toHaveBeenCalledWith(expect.stringContaining('화면 내용만 정면으로 보여주는 16:9 완성 UI 이미지'));
    expect(mocks.writeClipboard).toHaveBeenCalledWith(expect.stringContaining('캐릭터·노트북 외관·손·책상은 포함하지 마세요'));
    expect(mocks.writeClipboard).toHaveBeenCalledWith(expect.stringContaining('로고 파일'));
  });

  it('필요 이미지 결과에 다른 장면의 유사한 저장 이미지가 있으면 표시하고 재사용한다', async () => {
    const oldAsset: SceneReferenceAsset = { ...suggestions[1], category: 'prop', priority: 'required', id: '기존-노트북', status: 'proposed' };
    const oldScene: Scene = { id: 's0', title: '첫 업무', action: '', dialogue: '', camera: '', mood: '', negativePrompt: '', referenceAssets: [oldAsset] };
    const oldEpisode: Episode = { id: 'e0', title: '첫 출근', idea: '', characterIds: ['c1'], scenes: [oldScene], status: 'draft', updatedAt: '' };
    const projectWithExisting = { ...project, episodes: [oldEpisode, episode] };
    mocks.loadImage.mockImplementation(async (id: string) => id === '기존-노트북' ? 'data:image/png;base64,RVhJU1RJTkc=' : undefined);
    mocks.requestSuggestions.mockResolvedValueOnce({ assets: [{ ...suggestions[1], keyword: '업무용 노트북' }] });
    const { container } = renderPanel({ project: projectWithExisting });

    await act(async () => { button(container, '필요 이미지 찾기').click(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

    expect(container.textContent).toContain('기존 이미지 있음');
    expect(container.textContent).toContain('첫 출근 · 첫 업무');
    expect(container.querySelector('img[alt="기존 업무용 노트북 이미지"]')).not.toBeNull();
    await act(async () => { button(container, '기존 이미지 사용').click(); await Promise.resolve(); await Promise.resolve(); });

    expect(mocks.saveImage).toHaveBeenCalledWith(expect.any(String), 'data:image/png;base64,RVhJU1RJTkc=');
    expect(container.querySelector('img[alt="업무용 노트북 생성 이미지"]')).not.toBeNull();
  });
});
