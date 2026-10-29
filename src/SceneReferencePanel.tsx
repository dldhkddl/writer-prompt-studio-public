import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Image, RefreshCw, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import { getCodexStatus } from './codex-client';
import { deleteReferenceAssetImage, loadReferenceAssetImage, saveReferenceAssetImage } from './image-store';
import { requestReferenceAssetSuggestions } from './reference-assets-client';
import { requestReferenceImage } from './reference-image-client';
import { buildReferenceAssetRequest, createSceneReferenceAssets, findExistingReferenceAssetMatch, referenceAssetCategoryLabels } from './reference-assets';
import type { ExistingReferenceAssetMatch } from './reference-assets';
import type { Episode, Project, Scene, SceneReferenceAsset } from './types';
import './scene-reference.css';
import './existing-reference.css';

type Props = { project: Project; episode: Episode; scene: Scene; onUpdateScene: (patch: Partial<Scene>) => void };

export default function SceneReferencePanel({ project, episode, scene, onUpdateScene }: Props) {
  const [assets, setAssets] = useState<SceneReferenceAsset[]>(scene.referenceAssets ?? []);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [existingImages, setExistingImages] = useState<Record<string, ExistingReferenceAssetMatch & { imageDataUrl: string }>>({});
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const requestRef = useRef<AbortController | undefined>(undefined);
  const castWithImages = useMemo(() => {
    const castIds = new Set(scene.characterIds ?? episode.characterIds);
    return project.characters.filter((character) => castIds.has(character.id) && character.imageDataUrl);
  }, [episode.characterIds, project.characters, scene.characterIds]);
  const existingMatches = useMemo(() => assets.flatMap((asset) => {
    const match = findExistingReferenceAssetMatch(project, scene.id, asset);
    return match ? [{ targetId: asset.id, match }] : [];
  }), [assets, project, scene.id]);

  useEffect(() => {
    requestRef.current?.abort();
    const currentAssets = scene.referenceAssets ?? [];
    let active = true;
    setAssets(currentAssets);
    setGeneratedImages({});
    setError('');
    setLoading(false);
    setGeneratingId('');
    Promise.all(currentAssets.map(async (asset) => [asset.id, await loadReferenceAssetImage(asset.id)] as const))
      .then((entries) => {
        if (!active) return;
        setGeneratedImages(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry[1]))));
      })
      .catch(() => { if (active) setError('저장된 생성 이미지 일부를 불러오지 못했습니다.'); });
    return () => {
      active = false;
      requestRef.current?.abort();
    };
  }, [scene.id, scene.referenceAssets]);

  useEffect(() => {
    let active = true;
    setExistingImages({});
    Promise.all(existingMatches.map(async ({ targetId, match }) => ({ targetId, match, imageDataUrl: await loadReferenceAssetImage(match.asset.id) })))
      .then((matches) => {
        if (!active) return;
        setExistingImages(Object.fromEntries(matches.filter((item): item is typeof item & { imageDataUrl: string } => Boolean(item.imageDataUrl)).map((item) => [item.targetId, { ...item.match, imageDataUrl: item.imageDataUrl }])));
      })
      .catch(() => { if (active) setExistingImages({}); });
    return () => { active = false; };
  }, [existingMatches]);

  const saveAssets = (next: SceneReferenceAsset[]) => {
    setAssets(next);
    onUpdateScene({ referenceAssets: next });
  };

  const generateSuggestions = async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const status = await getCodexStatus(controller.signal);
      if (!status.available || !status.authenticated) throw new Error(status.message);
      const result = await requestReferenceAssetSuggestions(buildReferenceAssetRequest(project, episode, scene), status.requestToken, controller.signal);
      if (!controller.signal.aborted) {
        await Promise.allSettled(assets.map((asset) => deleteReferenceAssetImage(asset.id)));
        setGeneratedImages({});
        saveAssets(createSceneReferenceAssets(result.assets));
      }
    } catch (caught) {
      if (caught instanceof Error && caught.name !== 'AbortError') setError(caught.message);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = undefined;
        setLoading(false);
      }
    }
  };

  const toggleApproval = (id: string) => {
    if (!generatedImages[id]) return;
    saveAssets(assets.map((asset) => asset.id === id ? { ...asset, status: asset.status === 'approved' ? 'proposed' : 'approved' } : asset));
  };
  const removeAsset = (id: string) => {
    void deleteReferenceAssetImage(id).catch(() => setError('저장된 생성 이미지를 지우지 못했습니다.'));
    setGeneratedImages((current) => { const next = { ...current }; delete next[id]; return next; });
    saveAssets(assets.filter((asset) => asset.id !== id));
  };
  const copyPrompt = async (asset: SceneReferenceAsset) => {
    try {
      await navigator.clipboard.writeText(asset.imagePrompt);
      const copyId = `prompt-${asset.id}`;
      setCopiedId(copyId);
      window.setTimeout(() => setCopiedId((current) => current === copyId ? '' : current), 1600);
    } catch { setError('이미지 프롬프트를 복사하지 못했습니다.'); }
  };
  const copyCodexRequest = async (asset: SceneReferenceAsset) => {
    const request = asset.category === 'screen' ? [
      '다음 영상 장면에 @screen으로 첨부할 화면 이미지를 생성해 주세요.',
      'OpenAI 내장 이미지 생성 도구를 사용하고, 완성 이미지를 이 대화에서 다운로드할 수 있게 보여 주세요.',
      '화면 내용만 정면으로 보여주는 16:9 완성 UI 이미지로 만들어 주세요.',
      '캐릭터·노트북 외관·손·책상은 포함하지 마세요.',
      `장면: ${scene.title}`,
      `장면 행동: ${scene.action}`,
      `화면 항목: ${asset.keyword}`,
      `필요한 이유: ${asset.reason}`,
      `이미지 프롬프트: ${asset.imagePrompt}`,
      '함께 첨부한 로고 파일이 있으면 원본 글자·심볼·색상·비율을 바꾸지 말고 회사 로고로 배치해 주세요.',
      '화면 안의 한국어 문구는 장면 행동에 적힌 문구만 정확하게 사용하고, 중국어·영어·임의 글자·추가 로고·워터마크는 만들지 마세요.',
    ].join('\n') : [
      '다음 장면에 사용할 참고 이미지를 생성해 주세요.',
      'OpenAI 내장 이미지 생성 도구를 사용하고, 완성 이미지를 이 대화에서 다운로드할 수 있게 보여 주세요.',
      `장면: ${scene.title}`,
      `이미지 항목: ${asset.keyword}`,
      `필요한 이유: ${asset.reason}`,
      `이미지 프롬프트: ${asset.imagePrompt}`,
      '제약: 이미지 안에 글자, 로고, 워터마크를 넣지 마세요.',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(request);
      const copyId = `codex-${asset.id}`;
      setCopiedId(copyId);
      window.setTimeout(() => setCopiedId((current) => current === copyId ? '' : current), 1600);
    } catch { setError('Codex 이미지 생성 요청을 복사하지 못했습니다.'); }
  };
  const importGeneratedImage = (asset: SceneReferenceAsset, file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('PNG, JPG, WEBP 이미지만 불러올 수 있습니다.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('이미지는 10MB 이하로 불러와 주세요.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') {
        setError('이미지 파일을 읽지 못했습니다.');
        return;
      }
      try {
        await saveReferenceAssetImage(asset.id, reader.result);
        setGeneratedImages((current) => ({ ...current, [asset.id]: reader.result as string }));
        if (asset.status === 'approved') saveAssets(assets.map((item) => item.id === asset.id ? { ...item, status: 'proposed' } : item));
        setError('');
      } catch {
        setError('생성 이미지를 저장하지 못했습니다.');
      }
    };
    reader.onerror = () => setError('이미지 파일을 읽지 못했습니다.');
    reader.readAsDataURL(file);
  };
  const generateImage = async (asset: SceneReferenceAsset) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setGeneratingId(asset.id);
    setError('');
    try {
      const status = await getCodexStatus(controller.signal);
      const result = await requestReferenceImage({
        assetId: asset.id,
        keyword: asset.keyword,
        category: asset.category,
        imagePrompt: asset.imagePrompt,
        sceneTitle: scene.title,
      }, status.requestToken, controller.signal);
      await saveReferenceAssetImage(asset.id, result.imageDataUrl);
      if (!controller.signal.aborted) {
        setGeneratedImages((current) => ({ ...current, [asset.id]: result.imageDataUrl }));
        if (asset.status === 'approved') saveAssets(assets.map((item) => item.id === asset.id ? { ...item, status: 'proposed' } : item));
      }
    } catch (caught) {
      if (caught instanceof Error && caught.name !== 'AbortError') setError(caught.message);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = undefined;
        setGeneratingId('');
      }
    }
  };
  const useExistingImage = async (asset: SceneReferenceAsset, existing: ExistingReferenceAssetMatch & { imageDataUrl: string }) => {
    try {
      await saveReferenceAssetImage(asset.id, existing.imageDataUrl);
      setGeneratedImages((current) => ({ ...current, [asset.id]: existing.imageDataUrl }));
      if (asset.status === 'approved') saveAssets(assets.map((item) => item.id === asset.id ? { ...item, status: 'proposed' } : item));
      setError('');
    } catch {
      setError('기존 이미지를 현재 장면에 연결하지 못했습니다.');
    }
  };
  const downloadImage = (asset: SceneReferenceAsset) => {
    const imageDataUrl = generatedImages[asset.id];
    if (!imageDataUrl) return;
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `${episode.title}-${scene.title}-${asset.keyword}.png`;
    link.click();
  };

  return <section className="reference-panel panel">
    <div className="reference-heading">
      <div><p className="eyebrow">SCENE IMAGE LIST</p><h3>이 장면에 필요한 이미지</h3><p>GPT로 바로 생성하거나 기존 이미지를 불러온 뒤 확인하고 승인하세요.</p></div>
      <button className="secondary-button" type="button" onClick={() => void generateSuggestions()} disabled={loading}>
        {assets.length ? <RefreshCw size={15} /> : <Sparkles size={15} />} {loading ? 'Sol이 찾는 중…' : assets.length ? '다시 분석' : '필요 이미지 찾기'}
      </button>
    </div>

    {castWithImages.length > 0 && <div className="auto-reference-list">{castWithImages.map((character) => <div className="auto-reference" key={character.id}>
      <Image size={16} /><span><strong>{character.name} 기준 사진 자동 사용</strong><small>캐릭터 보관함의 사진을 다시 만들지 않고 그대로 씁니다.</small></span><Check size={15} />
    </div>)}</div>}

    {!assets.length && !loading && <div className="reference-empty"><Image size={24} /><strong>아직 이미지 목록이 없습니다</strong><span>버튼을 누르면 공간·의상·핵심 소품·화면을 3~6개로 정리해 드립니다.</span></div>}

    {assets.length > 0 && <div className="reference-asset-list">{assets.map((asset) => {
      const imageDataUrl = generatedImages[asset.id];
      const existingImage = existingImages[asset.id];
      return <article className={asset.status === 'approved' && imageDataUrl ? 'reference-asset approved' : 'reference-asset'} key={asset.id}>
        <div className="asset-head"><div><strong>{asset.keyword}</strong><span>{referenceAssetCategoryLabels[asset.category]}</span><span className={asset.priority === 'required' ? 'required' : ''}>{asset.priority === 'required' ? '필수' : '선택'}</span>{asset.status === 'approved' && imageDataUrl && <span className="asset-approved">승인됨</span>}</div><button className="icon-button" type="button" aria-label={`${asset.keyword} 삭제`} onClick={() => removeAsset(asset.id)}><Trash2 size={14} /></button></div>
        <p className="asset-reason">{asset.reason}</p>
        <div className="asset-prompt"><small>이미지 생성 프롬프트</small><p>{asset.imagePrompt}</p></div>
        {!imageDataUrl && existingImage && <div className="existing-reference"><img src={existingImage.imageDataUrl} alt={`기존 ${asset.keyword} 이미지`} /><span><strong>기존 이미지 있음</strong><small>{existingImage.episodeTitle} · {existingImage.sceneTitle}</small></span><button className="primary-button" type="button" onClick={() => void useExistingImage(asset, existingImage)}><Check size={14} /> 기존 이미지 사용</button></div>}
        {generatingId === asset.id && <div className="asset-image-loading"><RefreshCw size={20} /><strong>GPT가 이미지를 만들고 있어요</strong><span>완성되면 이 카드에 바로 표시됩니다.</span></div>}
        {imageDataUrl && <div className="asset-image-preview"><img src={imageDataUrl} alt={`${asset.keyword} 생성 이미지`} /></div>}
        <div className="asset-actions">
          <button className="primary-button" type="button" disabled={Boolean(generatingId)} onClick={() => void generateImage(asset)}><WandSparkles size={14} /> {generatingId === asset.id ? '이미지 생성 중…' : imageDataUrl ? 'GPT로 다시 생성' : 'GPT로 이미지 생성'}</button>
          <button className="secondary-button" type="button" onClick={() => void copyPrompt(asset)}><Copy size={14} /> {copiedId === `prompt-${asset.id}` ? '복사 완료' : '프롬프트 복사'}</button>
          <button className="primary-button" type="button" onClick={() => void copyCodexRequest(asset)}><WandSparkles size={14} /> {copiedId === `codex-${asset.id}` ? '요청 복사 완료' : imageDataUrl ? 'Codex 다시 생성 요청 복사' : 'Codex 이미지 요청 복사'}</button>
          <label className="secondary-button asset-import-button"><Image size={14} /> 생성 이미지 불러오기<input hidden type="file" accept="image/png,image/jpeg,image/webp" aria-label={`${asset.keyword} 생성 이미지 불러오기`} onChange={(event) => { importGeneratedImage(asset, event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} /></label>
          {imageDataUrl && <><button className="secondary-button" type="button" onClick={() => downloadImage(asset)}><Download size={14} /> PNG 다운로드</button><button className={asset.status === 'approved' ? 'secondary-button approved-button' : 'primary-button'} type="button" onClick={() => toggleApproval(asset.id)}><Check size={14} /> {asset.status === 'approved' ? '승인 취소' : '이 이미지 승인'}</button></>}
        </div>
      </article>;
    })}</div>}
    {error && <p className="reference-message" role="alert">{error}</p>}
  </section>;
}
