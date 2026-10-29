import { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, Sparkles, X } from 'lucide-react';
import { requestAppearanceSuggestion } from './appearance-client';
import { createAppearanceAnalysisCopy } from './appearance-image';
import {
  applyAppearanceProposal,
  discardAppearanceProposal,
  failAppearanceProposal,
  initialAppearanceProposalState,
  resetAppearanceProposal,
  resolveAppearanceProposal,
  startAppearanceProposal,
} from './appearance-proposal';
import { saveCharacterImage } from './image-store';
import type { Character } from './types';
import './character-appearance.css';

const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type Props = {
  character: Character;
  onUpdate: (patch: Partial<Character>) => void;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('선택한 사진을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

export default function CharacterAppearancePanel({ character, onUpdate }: Props) {
  const [proposal, setProposal] = useState(initialAppearanceProposalState);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const requestIdRef = useRef(0);

  const cancelCurrentRequest = () => {
    controllerRef.current?.abort();
    controllerRef.current = undefined;
  };

  const beginRequest = () => {
    cancelCurrentRequest();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setProposal((current) => ({ ...startAppearanceProposal(current), requestId }));
    return { controller, requestId };
  };

  const isCurrentRequest = (request: { controller: AbortController; requestId: number }) => (
    !request.controller.signal.aborted && request.requestId === requestIdRef.current
  );

  useEffect(() => {
    cancelCurrentRequest();
    requestIdRef.current += 1;
    setProposal((current) => ({ ...resetAppearanceProposal(current), requestId: requestIdRef.current }));
    return cancelCurrentRequest;
  }, [character.id]);

  const performAnalysis = async (
    request: { controller: AbortController; requestId: number },
    originalImageDataUrl?: string,
  ) => {
    const { controller, requestId } = request;
    try {
      const imageDataUrl = originalImageDataUrl
        ? await createAppearanceAnalysisCopy(originalImageDataUrl)
        : undefined;
      if (!isCurrentRequest(request)) return;
      const input = imageDataUrl
        ? { character: { id: character.id, type: character.type }, imageDataUrl }
        : {
            character: {
              id: character.id,
              name: character.name,
              type: character.type,
              personality: character.personality,
              habits: character.habits,
              likes: character.likes,
              dislikes: character.dislikes,
            },
          };
      const result = await requestAppearanceSuggestion(input, controller.signal);
      setProposal((current) => resolveAppearanceProposal(current, requestId, result.appearance));
    } catch (error) {
      if (!isCurrentRequest(request) || (error instanceof Error && error.name === 'AbortError')) return;
      const message = error instanceof Error ? error.message : '외형 제안을 만들지 못했습니다.';
      setProposal((current) => failAppearanceProposal(current, requestId, message));
    } finally {
      if (controllerRef.current === controller) controllerRef.current = undefined;
    }
  };

  const runAnalysis = (originalImageDataUrl?: string) => performAnalysis(beginRequest(), originalImageDataUrl);

  const uploadImage = async (file?: File) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_ORIGINAL_BYTES) {
      window.alert('JPG, PNG, WebP 형식의 5MB 이하 사진을 선택해주세요.');
      return;
    }
    const request = beginRequest();
    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      if (!isCurrentRequest(request)) return;
      await saveCharacterImage(character.id, imageDataUrl);
      if (!isCurrentRequest(request)) return;
      onUpdate({ imageDataUrl });
      await performAnalysis(request, imageDataUrl);
    } catch (error) {
      if (!isCurrentRequest(request) || (error instanceof Error && error.name === 'AbortError')) return;
      const message = error instanceof Error ? error.message : '기준 사진을 저장하지 못했습니다.';
      setProposal((current) => failAppearanceProposal(current, request.requestId, message));
      if (controllerRef.current === request.controller) controllerRef.current = undefined;
    }
  };

  const applyProposal = () => {
    const appearance = applyAppearanceProposal(proposal);
    if (!appearance) return;
    onUpdate({ appearance });
    setProposal((current) => discardAppearanceProposal(current));
  };

  return <div className="appearance-assistant">
    <div className="image-hint">
      <Sparkles size={15} />
      <span>
        <strong>기준 사진 연결</strong>
        <small>원본은 이 컴퓨터에 저장됩니다. JPG, PNG, WebP 5MB 이하.</small>
      </span>
      <label className="secondary-button upload-label">
        {character.imageDataUrl ? '사진 바꾸기' : '사진 업로드'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            void uploadImage(event.target.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
      </label>
    </div>

    <div className="appearance-actions-row">
      <div>
        <strong>Sol 외형 제안</strong>
        <small>{character.imageDataUrl ? '사진에서 보이는 특징만 정리합니다.' : '현재 설정을 바탕으로 외형을 창작합니다.'}</small>
      </div>
      <button
        type="button"
        className="secondary-button appearance-create-button"
        disabled={proposal.status === 'loading'}
        onClick={() => void runAnalysis(character.imageDataUrl)}
      >
        {character.imageDataUrl ? <><RefreshCw size={14} /> 외형 다시 분석</> : <><Sparkles size={14} /> 사진 없이 외형 만들기</>}
      </button>
    </div>

    {proposal.status === 'loading' && <div className="appearance-status loading"><span className="appearance-spinner" />Sol 작가가 외형을 정리하고 있습니다…</div>}

    {proposal.status === 'ready' && <div className="appearance-proposal-card">
      <div className="appearance-proposal-title"><Sparkles size={14} /><strong>외형 제안</strong><span>아직 적용되지 않았어요</span></div>
      <p>{proposal.proposal}</p>
      <div className="appearance-proposal-buttons">
        <button type="button" className="primary-button" onClick={applyProposal}><Check size={14} /> 적용</button>
        <button type="button" className="secondary-button" onClick={() => void runAnalysis(character.imageDataUrl)}><RefreshCw size={14} /> 다시 만들기</button>
        <button type="button" className="text-button discard-button" onClick={() => setProposal((current) => discardAppearanceProposal(current))}><X size={14} /> 버리기</button>
      </div>
    </div>}

    {proposal.status === 'error' && <div className="appearance-status error">
      <span>{proposal.error}</span>
      <button type="button" className="text-button" onClick={() => void runAnalysis(character.imageDataUrl)}><RefreshCw size={13} /> 다시 시도</button>
    </div>}

    <p className="appearance-privacy">외형 분석 시 축소본만 Codex로 전송되고 임시 파일은 분석 후 삭제됩니다. 실제 이미지와 영상은 Higgsfield에서 만듭니다.</p>
  </div>;
}
