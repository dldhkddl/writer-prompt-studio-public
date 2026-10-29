import { useEffect, useRef, useState } from 'react';
import { Bot, Check, LoaderCircle, RefreshCw, Sparkles, WandSparkles } from 'lucide-react';
import { getCodexStatus, requestStoryDraft } from './codex-client';
import type { CodexDraftResponse, CodexStatus } from './codex-client';
import { applyCodexDraft, applyCodexField, buildCodexStoryRequest, codexStoryFields } from './codex-draft';
import { formatFullScript } from './full-script';
import type { CodexStoryField } from './codex-draft';
import type { Episode, Project } from './types';
import './codex-writer-panel.css';

const labels: Record<CodexStoryField, string> = {
  logline: '로그라인', theme: '주제', outerGoal: '외적 목표', innerNeed: '내적 필요', flaw: '내적 약점', obstacle: '외부 장애물', stakes: '실패의 대가', twist: '전환·반전', ending: '결말과 변화', nextHook: '다음 편 연결',
};

export default function CodexWriterPanel({ project, episode, onApply }: { project: Project; episode: Episode; onApply: (patch: Partial<Episode>) => void }) {
  const [status, setStatus] = useState<CodexStatus>();
  const [result, setResult] = useState<CodexDraftResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const episodeIdRef = useRef(episode.id);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const checkStatus = async () => {
    try { setStatus(await getCodexStatus()); setError(''); }
    catch { setStatus({ available: false, authenticated: false, message: '로컬 Codex 서버에 연결할 수 없습니다.', requestToken: '' }); }
  };
  useEffect(() => { void checkStatus(); }, []);
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = undefined;
    episodeIdRef.current = episode.id;
    requestIdRef.current += 1;
    setResult(undefined);
    setError('');
    setLoading(false);
  }, [episode.id]);

  const generate = async () => {
    if (!status?.requestToken) return;
    const requestId = ++requestIdRef.current;
    const episodeId = episode.id;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setError(''); setResult(undefined);
    try {
      const nextResult = await requestStoryDraft(buildCodexStoryRequest(project, episode), status.requestToken, controller.signal);
      if (requestIdRef.current === requestId && episodeIdRef.current === episodeId) setResult(nextResult);
    }
    catch (cause) {
      if (!controller.signal.aborted && requestIdRef.current === requestId && episodeIdRef.current === episodeId) setError(cause instanceof Error ? cause.message : 'Codex 초안 생성에 실패했습니다.');
    }
    finally {
      if (requestIdRef.current === requestId && episodeIdRef.current === episodeId) {
        if (abortRef.current === controller) abortRef.current = undefined;
        setLoading(false);
      }
    }
  };
  const applyAll = () => {
    const next = applyCodexDraft(episode, result?.draft ?? { beats: [], editorNotes: [] });
    onApply({ ...next, fullScript: formatFullScript(next.beats ?? []) });
  };
  const applyField = (field: CodexStoryField | 'beats') => { if (result) onApply(applyCodexField(episode, result.draft, field)); };

  return <section className="codex-writer panel">
    <div className="codex-writer-head"><div className="codex-title"><span><Bot size={18} /></span><div><p className="eyebrow">LOCAL CODEX</p><h3>Codex 공동 작가</h3></div></div><div className={`codex-status ${status?.authenticated ? 'connected' : 'offline'}`}><i />{status?.message ?? '연결 확인 중'}</div></div>
    <div className="codex-writer-body"><div><p>현재 에피소드와 프로젝트의 작가 역할을 읽고, 시나리오 초안과 편집 의견을 제안합니다.</p>{status && !status.authenticated && <div className="codex-login-note"><code>codex login</code><span>터미널에서 로그인한 뒤 연결 상태를 다시 확인해주세요.</span></div>}{error && <p className="codex-error">{error}</p>}</div><div className="codex-actions"><button className="secondary-button" onClick={checkStatus}><RefreshCw size={15} /> 상태 확인</button><button className="primary-button" disabled={!status?.authenticated || loading} onClick={generate}>{loading ? <LoaderCircle className="spin" size={16} /> : <WandSparkles size={16} />}{loading ? '작가실 회의 중…' : 'Codex로 초안 만들기'}</button></div></div>
    {result && <div className="codex-proposal"><div className="proposal-head"><div><span><Sparkles size={14} /> CODEX PROPOSAL</span><strong>시나리오 제안 비교</strong></div><button className="primary-button" onClick={applyAll}><Check size={15} /> 전체 적용</button></div><div className="proposal-list">{codexStoryFields.map((field) => <ProposalRow key={field} label={labels[field]} current={String(episode[field] ?? '')} proposed={String(result.draft[field] ?? '')} onApply={() => applyField(field)} />)}<ProposalRow label="7단계 비트" current={(episode.beats ?? []).map((beat) => `${beat.label}: ${beat.content}`).join('\n')} proposed={result.draft.beats.map((beat) => `${beat.kind}: ${beat.content}`).join('\n')} onApply={() => applyField('beats')} /></div>{result.editorNotes.length > 0 && <div className="editor-notes"><strong>스토리 에디터 의견</strong>{result.editorNotes.map((note) => <p key={note}>• {note}</p>)}</div>}</div>}
  </section>;
}

function ProposalRow({ label, current, proposed, onApply }: { label: string; current: string; proposed: string; onApply: () => void }) {
  return <article className="proposal-row"><div className="proposal-label"><strong>{label}</strong><button onClick={onApply} disabled={!proposed.trim()}>이 항목 적용</button></div><div className="proposal-compare"><div><span>현재</span><p>{current || '비어 있음'}</p></div><div><span>Codex 제안</span><p>{proposed || '제안 없음'}</p></div></div></article>;
}
