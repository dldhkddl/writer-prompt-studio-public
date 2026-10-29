import { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Clapperboard, Laugh, LoaderCircle, Route, Sparkles } from 'lucide-react';
import { getCodexStatus } from './codex-client';
import { requestSeriesProposals } from './series-client';
import { buildSeriesProposalRequest } from './series-draft';
import type { ComedyMode, Project, SeriesPlan, SeriesProposal, TrendNote } from './types';
import './series-room.css';

type Props = {
  project: Project;
  onUpdatePlan: (plan: SeriesPlan) => void;
  onApproveProposal: (proposalId: string) => void;
};

const modeCopy: Record<ComedyMode, { title: string; description: string; badge: string }> = {
  relatable: { title: '현실 공감 코미디', description: '회사·관계·일상에서 “나도 저랬는데” 싶은 웃음', badge: '공감' },
  meme: { title: '밈·과장 코미디', description: '성격은 지키면서 행동과 시각적 반전을 더 크게', badge: '과장' },
};

const makePlan = (project: Project): SeriesPlan => {
  const now = new Date().toISOString();
  return {
    premise: '',
    protagonistId: project.characters[0]?.id ?? '',
    worldId: project.worlds[0]?.id,
    status: 'planning',
    comedyModes: ['relatable'],
    pendingProposals: [],
    createdAt: now,
    updatedAt: now,
  };
};

const modeLabel = (mode: ComedyMode) => modeCopy[mode].title;

export default function SeriesRoom({ project, onUpdatePlan, onApproveProposal }: Props) {
  const plan = project.seriesPlan ?? makePlan(project);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const history = project.episodes
    .filter((episode) => episode.seriesMeta)
    .sort((left, right) => (left.seriesMeta?.sequence ?? 0) - (right.seriesMeta?.sequence ?? 0));

  useEffect(() => () => controllerRef.current?.abort(), []);

  const updatePlan = (patch: Partial<SeriesPlan>) => {
    onUpdatePlan({ ...plan, ...patch, updatedAt: new Date().toISOString() });
  };
  const updateSetup = (patch: Partial<Pick<SeriesPlan, 'premise' | 'protagonistId' | 'worldId' | 'comedyModes'>>) => {
    controllerRef.current?.abort();
    controllerRef.current = undefined;
    setLoading(false);
    setError('');
    updatePlan({ ...patch, pendingProposals: [] });
  };
  const toggleMode = (mode: ComedyMode) => {
    const selected = plan.comedyModes.includes(mode);
    const next = selected ? plan.comedyModes.filter((item) => item !== mode) : [...plan.comedyModes, mode];
    if (next.length) updateSetup({ comedyModes: next });
  };
  const generate = async () => {
    if (!plan.premise.trim()) { setError('첫 상황을 한 줄로 입력해 주세요.'); return; }
    if (!plan.protagonistId) { setError('주인공을 선택해 주세요.'); return; }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const status = await getCodexStatus(controller.signal);
      if (!status.available || !status.authenticated) throw new Error(status.message);
      const request = buildSeriesProposalRequest({ ...project, seriesPlan: plan });
      const result = await requestSeriesProposals(request, status.requestToken, controller.signal);
      if (controllerRef.current !== controller || controller.signal.aborted) return;
      updatePlan({ pendingProposals: result.proposals });
    } catch (reason) {
      if (reason instanceof Error && reason.name !== 'AbortError') setError(reason.message);
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = undefined;
        setLoading(false);
      }
    }
  };

  return <section className="page series-room">
    <div className="page-title series-title">
      <div><p className="eyebrow accent">SERIES WRITER</p><h2>연재 자동 작가</h2><p>첫 상황만 정하면 이전 화를 기억하며 재미있는 다음 화 3개를 제안합니다. 확정 전에는 아무것도 바뀌지 않아요.</p></div>
      <div className="series-stage-note"><Sparkles size={16} /><span><strong>Sol 2단계 집필</strong><small>작가 후보 6개 → 재미 편집자 최종 3개</small></span></div>
    </div>

    <div className="series-layout">
      <div className="series-main">
        <div className="panel series-setup">
          <div className="panel-heading"><div><p className="eyebrow">SERIES SETUP</p><h3>연재의 출발점</h3></div><span className="series-safe"><Check size={13} /> 승인 후 반영</span></div>
          <label className="field series-premise"><span>첫 상황</span><textarea value={plan.premise} placeholder="예: 오늘 면접 준비를 시작한 줄리아" onChange={(event) => updateSetup({ premise: event.target.value })} /></label>
          <div className="form-grid">
            <label className="field"><span>주인공</span><select value={plan.protagonistId} onChange={(event) => updateSetup({ protagonistId: event.target.value })}>{project.characters.map((character) => <option value={character.id} key={character.id}>{character.name}</option>)}</select></label>
            <label className="field"><span>기본 세계관</span><select value={plan.worldId ?? ''} onChange={(event) => updateSetup({ worldId: event.target.value || undefined })}><option value="">세계관 없이 시작</option>{project.worlds.map((world) => <option value={world.id} key={world.id}>{world.name}</option>)}</select></label>
          </div>
          <div className="comedy-selector"><span className="selector-label">재미 방식 · 둘 다 선택 가능</span><div className="comedy-options">{(['relatable', 'meme'] as const).map((mode) => {
            const selected = plan.comedyModes.includes(mode);
            return <label key={mode} className={selected ? 'comedy-option selected' : 'comedy-option'}><input type="checkbox" value={mode} checked={selected} onChange={() => toggleMode(mode)} /><span className="comedy-check">{selected && <Check size={13} />}</span><span><strong>{modeCopy[mode].title}</strong><small>{modeCopy[mode].description}</small></span></label>;
          })}</div></div>
          {error && <div className="series-error" role="alert">{error}</div>}
          <button className="primary-button series-generate" disabled={loading || !project.characters.length} onClick={generate}>{loading ? <><LoaderCircle className="spin" size={17} /> Sol 작가와 재미 편집자가 집필 중…</> : <><Sparkles size={17} /> {history.length ? '다음 화 3개 제안' : '연재 시작 · 3개 제안'}</>}</button>
          <p className="series-generation-hint">두 방식을 선택하면 후보 6개를 3개씩 만든 뒤, 최종 제안에도 두 방식이 모두 포함됩니다.</p>
        </div>

        <div className="series-proposal-section">
          <div className="section-heading"><div><p className="eyebrow">WRITER'S PICKS</p><h3>작가의 이번 화 제안 <span>{plan.pendingProposals.length}/3</span></h3></div>{plan.pendingProposals.length > 0 && <button className="text-button" disabled={loading} onClick={generate}>새 조합 다시 받기 <ChevronRight size={15} /></button>}</div>
          {plan.pendingProposals.length ? <div className="series-proposals">{plan.pendingProposals.map((proposal, index) => <ProposalCard key={proposal.id} proposal={proposal} trends={project.trends.filter((trend) => proposal.trendIds.includes(trend.id))} index={index} onApprove={() => onApproveProposal(proposal.id)} />)}</div> : <div className="panel series-empty"><Laugh size={26} /><strong>아직 기다리는 제안이 없어요.</strong><p>첫 상황과 재미 방식을 정하면 캐릭터가 직접 문제를 만들고 해결하는 다음 화를 제안합니다.</p></div>}
        </div>
      </div>

      <aside className="panel series-timeline">
        <div className="panel-heading"><div><p className="eyebrow">SERIES MEMORY</p><h3>연재 시간선</h3></div><Route size={19} /></div>
        {history.length ? <ol>{history.map((episode) => <li key={episode.id}><span className="timeline-sequence">{String(episode.seriesMeta?.sequence ?? 0).padStart(2, '0')}</span><div><small>{episode.seriesMeta?.category} · {episode.seriesMeta && modeLabel(episode.seriesMeta.comedyMode)}</small><strong>{episode.title}</strong><p>{episode.ending || episode.idea}</p>{episode.seriesMeta?.openThreads.length ? <em>남은 실마리 {episode.seriesMeta.openThreads.length}개</em> : null}</div></li>)}</ol> : <div className="timeline-empty"><Clapperboard size={24} /><strong>첫 화 승인 전</strong><p>확정한 에피소드만 여기에 쌓이고 다음 제안의 기억으로 사용됩니다.</p></div>}
      </aside>
    </div>
  </section>;
}

function ProposalCard({ proposal, trends, index, onApprove }: { proposal: SeriesProposal; trends: TrendNote[]; index: number; onApprove: () => void }) {
  return <article className="panel series-proposal-card">
    <div className="proposal-top"><span className={`proposal-rank rank-${index + 1}`}>PICK {index + 1}</span><span className={proposal.comedyMode === 'meme' ? 'pill peach-pill' : 'pill lavender-pill'}>{modeCopy[proposal.comedyMode].badge} 코미디</span></div>
    <p className="proposal-category">{proposal.category}</p><h3>{proposal.title}</h3><p className="proposal-logline">{proposal.logline}</p>
    <div className="fun-reason"><Laugh size={15} /><span><small>왜 재미있는지</small><strong>{proposal.fun.funReason}</strong></span></div>
    <div className="proposal-flow"><span>상황</span><p>{proposal.fun.setup}</p><i>→</i><span>상승</span><p>{proposal.fun.escalation}</p><i>→</i><span>반전</span><p>{proposal.fun.reversal}</p></div>
    {trends.length > 0 && <div className="proposal-sources"><strong>사용한 트렌드 근거</strong>{trends.map((trend) => <a key={trend.id} href={trend.sourceUrl} target="_blank" rel="noreferrer">{trend.title} · {trend.checkedAt} <ChevronRight size={12} /></a>)}</div>}
    <details><summary>7개 장면과 연재 변화 보기</summary><div className="proposal-details"><ol>{proposal.beats.map((beat) => <li key={beat.kind}><span>{beat.kind}</span><p>{beat.content}</p><small>마지막 상태 · {beat.continuityOut}</small></li>)}</ol>{proposal.stateChanges.length > 0 && <p><strong>이번 화 이후:</strong> {proposal.stateChanges.join(' · ')}</p>}{proposal.nextHook && <p><strong>다음 화 실마리:</strong> {proposal.nextHook}</p>}</div></details>
    <button className="primary-button proposal-approve" onClick={onApprove}><Check size={16} /> 이번 화로 확정</button>
  </article>;
}
