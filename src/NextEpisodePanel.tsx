import { useEffect, useRef, useState } from 'react';
import { ArrowRight, GitBranch, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import { getCodexStatus } from './codex-client';
import { requestSeriesProposals } from './series-client';
import { buildNextEpisodePlan, buildNextEpisodeProposalRequest } from './series-draft';
import type { Episode, Project, SeriesPlan, SeriesProposal } from './types';
import './next-episode-panel.css';

type Props = {
  project: Project;
  episode: Episode;
  onUpdatePlan: (plan: SeriesPlan) => void;
  onApproveProposal: (proposalId: string) => void;
};

const branches = [
  { label: '바로 이어가기', description: '현재 사건의 결과와 다음 훅을 곧바로 잇는 후속편' },
  { label: '관계 넓히기', description: '캐릭터 관계나 회사·일상을 확장하는 이야기' },
  { label: '뜻밖의 변화', description: '설정은 지키면서 예상 밖 문제나 반전을 여는 이야기' },
];

export default function NextEpisodePanel({ project, episode, onUpdatePlan, onApproveProposal }: Props) {
  const initial = project.seriesPlan?.sourceEpisodeId === episode.id ? project.seriesPlan.pendingProposals : [];
  const [proposals, setProposals] = useState<SeriesProposal[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    controllerRef.current?.abort();
    controllerRef.current = undefined;
    setLoading(false);
    setError('');
    setProposals(project.seriesPlan?.sourceEpisodeId === episode.id ? project.seriesPlan.pendingProposals : []);
  }, [episode.id]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const generate = async () => {
    if (!episode.characterIds.length) { setError('현재 시나리오의 주인공을 먼저 선택해 주세요.'); return; }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const status = await getCodexStatus(controller.signal);
      if (!status.available || !status.authenticated) throw new Error(status.message);
      const now = new Date().toISOString();
      const plan = buildNextEpisodePlan(project, episode, now);
      const request = buildNextEpisodeProposalRequest(project, episode, plan);
      const result = await requestSeriesProposals(request, status.requestToken, controller.signal);
      if (controllerRef.current !== controller || controller.signal.aborted) return;
      setProposals(result.proposals);
      onUpdatePlan({ ...plan, pendingProposals: result.proposals, updatedAt: new Date().toISOString() });
    } catch (reason) {
      if (reason instanceof Error && reason.name !== 'AbortError') setError(reason.message);
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = undefined;
        setLoading(false);
      }
    }
  };

  return <section className="panel next-episode-panel" aria-labelledby="next-episode-title">
    <div className="next-episode-head">
      <div className="next-episode-heading-copy"><span className="next-episode-icon"><GitBranch size={18} /></span><div><p className="eyebrow">NEXT EPISODE BRANCHES</p><h3 id="next-episode-title">다음 편 추천받기</h3><p>현재 시나리오의 결말·다음 훅·비트·장면과 대사를 모두 읽고 서로 다른 3갈래를 제안합니다.</p></div></div>
      <button className="primary-button next-episode-generate" onClick={generate} disabled={loading}>
        {loading ? <><LoaderCircle className="spin" size={16} /> 시나리오 읽는 중…</> : proposals.length ? <><RefreshCw size={16} /> 다른 3개 다시 받기</> : <><Sparkles size={16} /> 다음 편 추천받기</>}
      </button>
    </div>
    {error && <div className="series-error" role="alert">{error}</div>}
    {proposals.length > 0 && <div className="next-episode-grid">
      {proposals.slice(0, 3).map((proposal, index) => {
        const branch = branches[index];
        return <article className="next-episode-card" key={proposal.id}>
          <div className="next-episode-branch"><span>{String(index + 1).padStart(2, '0')}</span><strong>{branch.label}</strong></div>
          <small>{branch.description}</small>
          <h4>{proposal.title}</h4>
          <p>{proposal.logline}</p>
          <div className="next-episode-fun"><span>재미 포인트</span><strong>{proposal.fun.funReason}</strong></div>
          <button className="secondary-button" onClick={() => onApproveProposal(proposal.id)} aria-label={`${proposal.title} 선택`}>
            이 갈래 선택 <ArrowRight size={15} />
          </button>
        </article>;
      })}
    </div>}
  </section>;
}
