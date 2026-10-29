import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, RefreshCw, Sparkles, X } from 'lucide-react';
import { getCodexStatus } from './codex-client';
import { requestHiggsfieldPrompt } from './higgsfield-client';
import { buildHiggsfieldDraftRequest } from './higgsfield-draft';
import { buildHiggsfieldExecutionPrompt, buildHiggsfieldReferenceBrief, createHiggsfieldPromptSourceKey } from './prompt-builder';
import { buildApprovedReferenceAssetRules } from './reference-assets';
import type { Episode, Project, Scene } from './types';
import './higgsfield-prompt.css';

type Props = {
  project: Project;
  episode: Episode;
  scene: Scene;
  onUpdateScene: (patch: Partial<Scene>) => void;
};

export default function HiggsfieldPromptPanel({ project, episode, scene, onUpdateScene }: Props) {
  const [proposal, setProposal] = useState<{ prompt: string; sourceKey: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const requestRef = useRef<AbortController | undefined>(undefined);
  const autoRequestedSceneIdsRef = useRef(new Set<string>());
  const context = useMemo(() => {
    const sceneCast = new Set(scene.characterIds ?? episode.characterIds);
    const sceneIndex = episode.scenes.findIndex((candidate) => candidate.id === scene.id);
    const previousScene = sceneIndex > 0 ? episode.scenes[sceneIndex - 1] : undefined;
    return {
      episodeTitle: episode.title,
      characters: project.characters.filter((character) => sceneCast.has(character.id)),
      world: project.worlds.find((world) => world.id === episode.worldId),
      relationships: project.relationships.filter((relationship) => sceneCast.has(relationship.fromCharacterId) && sceneCast.has(relationship.toCharacterId)),
      story: { logline: episode.logline, theme: episode.theme, outerGoal: episode.outerGoal, obstacle: episode.obstacle },
      previousScene: previousScene ? {
        title: previousScene.title,
        action: previousScene.action,
        dialogue: previousScene.dialogue,
        continuityOut: previousScene.continuityOut,
      } : undefined,
    };
  }, [episode, project.characters, project.relationships, project.worlds, scene.characterIds, scene.id]);
  const sourceKey = useMemo(() => createHiggsfieldPromptSourceKey(scene, context), [context, scene]);
  const localPrompt = useMemo(() => buildHiggsfieldExecutionPrompt(scene, context), [context, scene]);
  const referenceBrief = useMemo(() => buildHiggsfieldReferenceBrief(scene, context), [context, scene]);
  const storedPromptIsCurrent = Boolean(scene.higgsfieldPrompt && scene.higgsfieldPromptSourceKey === sourceKey);
  const visiblePrompt = storedPromptIsCurrent ? scene.higgsfieldPrompt! : localPrompt;
  const storedPromptIsStale = Boolean(scene.higgsfieldPrompt && !storedPromptIsCurrent);

  useEffect(() => {
    requestRef.current?.abort();
    setProposal(undefined);
    setError('');
    setLoading(false);
    return () => requestRef.current?.abort();
  }, [scene.id, sourceKey]);

  const generate = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const requestSourceKey = sourceKey;
      const status = await getCodexStatus(controller.signal);
      if (!status.available || !status.authenticated) throw new Error(status.message);
      const result = await requestHiggsfieldPrompt(buildHiggsfieldDraftRequest(project, episode, scene), status.requestToken, controller.signal);
      const referenceRules = buildApprovedReferenceAssetRules(scene.referenceAssets);
      const prompt = referenceRules && !result.prompt.includes('승인된 참고 이미지만')
        ? `${result.prompt}\n\nAPPROVED REFERENCE IMAGES\n${referenceRules}`
        : result.prompt;
      if (!controller.signal.aborted) setProposal({ prompt, sourceKey: requestSourceKey });
    } catch (caught) {
      if (caught instanceof Error && caught.name !== 'AbortError') setError(caught.message);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = undefined;
        setLoading(false);
      }
    }
  }, [episode, project, scene, sourceKey]);

  useEffect(() => {
    if (storedPromptIsCurrent || autoRequestedSceneIdsRef.current.has(scene.id)) return;
    const timer = window.setTimeout(() => {
      autoRequestedSceneIdsRef.current.add(scene.id);
      void generate();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [generate, scene.id, storedPromptIsCurrent]);
  const applyProposal = () => {
    if (!proposal) return;
    if (proposal.sourceKey !== sourceKey) {
      setProposal(undefined);
      setError('장면 설정이 바뀌었습니다. 현재 설정으로 다시 제안해 주세요.');
      return;
    }
    onUpdateScene({ higgsfieldPrompt: proposal.prompt, higgsfieldPromptSourceKey: proposal.sourceKey });
    setProposal(undefined);
  };
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(visiblePrompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  };
  const downloadPrompt = () => {
    const blob = new Blob([visiblePrompt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${episode.title || '힉스필드-프롬프트'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="prompt-panel">
    <div className="prompt-head"><div><p className="eyebrow">힉스필드 실행 준비</p><h3>바로 쓰는 실행 프롬프트</h3></div><span className="ready-dot"><span /> {storedPromptIsCurrent ? 'SOL 적용됨' : '기본 초안'}</span></div>
    {storedPromptIsStale && <div className="prompt-stale" role="status">설정이 바뀌어 다시 제안이 필요해요. 현재 설정으로 만든 기본 프롬프트를 표시합니다.</div>}
    <pre>{visiblePrompt}</pre>
    <div className="prompt-actions">
      <button className="primary-button" onClick={copyPrompt}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? '복사 완료' : '프롬프트 복사'}</button>
      <button className="secondary-button" onClick={downloadPrompt}><Download size={16} /> TXT 저장</button>
      <button className="secondary-button sol-button" onClick={generate} disabled={loading}><Sparkles size={16} /> {loading ? 'Sol이 연출 중…' : storedPromptIsCurrent || storedPromptIsStale ? 'Sol로 다시 제안' : 'Sol로 구체화'}</button>
    </div>
    {error && <p className="prompt-error" role="alert">{error}</p>}
    {proposal?.sourceKey === sourceKey && <div className="prompt-proposal" aria-live="polite"><div><span><Sparkles size={15} /> SOL 제안</span><button className="icon-button" aria-label="제안 닫기" onClick={() => setProposal(undefined)}><X size={15} /></button></div><p>{proposal.prompt}</p><div className="proposal-actions"><button className="primary-button" onClick={applyProposal}><Check size={16} /> 제안 적용</button><button className="secondary-button" onClick={generate}><RefreshCw size={15} /> 다시 제안</button></div></div>}
    <details className="prompt-reference"><summary>설정 근거 보기</summary><pre>{referenceBrief}</pre></details>
  </div>;
}
