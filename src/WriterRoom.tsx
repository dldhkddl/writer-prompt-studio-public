import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Clapperboard, Feather, RefreshCw, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { beatsToScenes, createDefaultBeats, reviewStory } from './story-structure';
import type { Episode, Project, SeriesPlan, StoryBeat } from './types';
import CodexWriterPanel from './CodexWriterPanel';
import FullScriptPanel from './FullScriptPanel';
import NextEpisodePanel from './NextEpisodePanel';
import './writer-room.css';
import './writer-room-extra.css';
import './episode-delete.css';
import './writer-continuity.css';

type WriterRoomProps = {
  project: Project;
  episode: Episode;
  onSelectEpisode: (id: string) => void;
  onUpdateEpisode: (patch: Partial<Episode>) => void;
  onOpenStudio: (sceneId?: string) => void;
  onDeleteEpisode: (id: string) => Promise<boolean>;
  onUpdatePlan: (plan: SeriesPlan) => void;
  onApproveProposal: (proposalId: string) => void;
};

const storyFields: { key: keyof Episode; label: string; prompt: string; wide?: boolean }[] = [
  { key: 'logline', label: '로그라인', prompt: '누가, 무엇을 원하고, 무엇이 방해하는지 한 문장으로 적어주세요.', wide: true },
  { key: 'theme', label: '이번 화의 주제', prompt: '시청자에게 남기고 싶은 감정이나 생각은 무엇인가요?', wide: true },
  { key: 'outerGoal', label: '외적 목표', prompt: '주인공이 이번 화에서 겉으로 이루려는 것은?' },
  { key: 'innerNeed', label: '내적 필요', prompt: '주인공이 실제로 배우거나 인정해야 하는 것은?' },
  { key: 'flaw', label: '내적 약점', prompt: '주인공 스스로 문제를 키우는 성향은?' },
  { key: 'obstacle', label: '외부 장애물', prompt: '목표를 방해하는 인물, 상황 또는 규칙은?' },
  { key: 'stakes', label: '실패의 대가', prompt: '실패하면 무엇을 잃거나 망신당하나요?' },
  { key: 'twist', label: '전환·반전', prompt: '중간에 예상과 달라지는 사실이나 선택은?' },
  { key: 'ending', label: '결말과 변화', prompt: '사건이 어떻게 끝나고 주인공은 무엇이 달라지나요?', wide: true },
  { key: 'nextHook', label: '다음 편 연결', prompt: '다음 이야기를 궁금하게 만들 마지막 장치는?', wide: true },
];

export default function WriterRoom({ project, episode, onSelectEpisode, onUpdateEpisode, onOpenStudio, onDeleteEpisode, onUpdatePlan, onApproveProposal }: WriterRoomProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const beats = episode.beats?.length ? episode.beats : createDefaultBeats();
  const issues = reviewStory({ logline: episode.logline, outerGoal: episode.outerGoal, obstacle: episode.obstacle, ending: episode.ending, characterIds: episode.characterIds, beats });
  const hasRequiredIssues = issues.some((issue) => issue.level === 'required');
  const filled = [episode.logline, episode.outerGoal, episode.obstacle, episode.ending, ...beats.map((beat) => beat.content)].filter((value) => value?.trim()).length;
  const score = Math.round((filled / 11) * 100);

  useEffect(() => {
    setConfirmingDelete(false);
    setIsDeleting(false);
  }, [episode.id]);

  const updateBeat = (id: string, patch: Partial<StoryBeat>) => onUpdateEpisode({ beats: beats.map((beat) => beat.id === id ? { ...beat, ...patch } : beat) });
  const createScenes = () => {
    const scenes = beatsToScenes(beats, episode.characterIds);
    if (!scenes.length) return;
    const shouldReplace = episode.scenes.length === 0 || window.confirm(`현재 장면 ${episode.scenes.length}개를 비트 시트 기반 장면 ${scenes.length}개로 교체할까요?`);
    if (shouldReplace) { onUpdateEpisode({ scenes }); onOpenStudio(scenes[0].id); }
  };
  const deleteEpisode = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      if (await onDeleteEpisode(episode.id)) setConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return <section className="page writer-room">
    <div className="writer-heading">
      <div><p className="eyebrow accent">WRITER'S ROOM</p><div className="writer-title-row"><select value={episode.id} onChange={(event) => { setConfirmingDelete(false); onSelectEpisode(event.target.value); }}>{project.episodes.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></div><p>아이디어를 장면마다 이어지는 8초 클립 이야기로 설계합니다.</p></div>
      <div className="writer-heading-actions"><div className="writer-score"><span>구조 완성도</span><strong>{score}</strong><small>/ 100</small><div><i style={{ width: `${score}%` }} /></div></div><button className="danger-button episode-delete-button" onClick={() => setConfirmingDelete(true)}><Trash2 size={15} /> 에피소드 삭제</button></div>
    </div>

    {confirmingDelete && <div className="episode-delete-confirmation" role="alert"><AlertCircle size={19} /><div><strong>‘{episode.title}’ 에피소드를 삭제할까요?</strong><p>모든 장면과 적용한 프롬프트(총 {episode.scenes.length}개 장면)가 함께 삭제되며 되돌릴 수 없습니다.</p></div><div><button className="secondary-button" disabled={isDeleting} onClick={() => setConfirmingDelete(false)}>취소</button><button className="danger-button solid" disabled={isDeleting} onClick={deleteEpisode}><Trash2 size={15} /> {isDeleting ? '삭제 중…' : '삭제하기'}</button></div></div>}

    <div className="writer-role-strip"><span><Feather size={15} /> 1. 시나리오 작가</span><ArrowRight size={14} /><span><ShieldCheck size={15} /> 2. 스토리 에디터</span><ArrowRight size={14} /><span><Clapperboard size={15} /> 3. 프롬프트 감독</span></div>

    <CodexWriterPanel project={project} episode={episode} onApply={onUpdateEpisode} />

    <FullScriptPanel project={project} episode={episode} onApply={onUpdateEpisode} onCreateScenes={createScenes} />

    <NextEpisodePanel project={project} episode={episode} onUpdatePlan={onUpdatePlan} onApproveProposal={onApproveProposal} />

    <div className="writer-grid">
      <div className="writer-main">
        <article className="panel writer-card">
          <div className="writer-card-head"><div><span className="writer-step">01</span><div><p className="eyebrow">STORY COMPASS</p><h3>이야기의 나침반</h3></div></div><Sparkles size={18} /></div>
          <label className="writer-field full"><span>한 줄 아이디어</span><textarea value={episode.idea} onChange={(event) => onUpdateEpisode({ idea: event.target.value })} /></label>
          <div className="writer-form">{storyFields.slice(0, 2).map((field) => <StoryField key={String(field.key)} label={field.label} prompt={field.prompt} wide={field.wide} value={String(episode[field.key] ?? '')} onChange={(value) => onUpdateEpisode({ [field.key]: value })} />)}</div>
          <div className="writer-casting"><label><span>사용 세계관</span><select value={episode.worldId ?? ''} onChange={(event) => onUpdateEpisode({ worldId: event.target.value || undefined })}><option value="">세계관 없음</option>{project.worlds.map((world) => <option value={world.id} key={world.id}>{world.name}</option>)}</select></label><div><span>출연 캐릭터</span><div className="cast-chips">{project.characters.map((character) => { const selected = episode.characterIds.includes(character.id); return <label className={selected ? 'cast-chip selected' : 'cast-chip'} key={character.id}><input type="checkbox" checked={selected} onChange={() => onUpdateEpisode({ characterIds: selected ? episode.characterIds.filter((id) => id !== character.id) : [...episode.characterIds, character.id] })} />{character.name}</label>; })}</div></div></div>
        </article>

        <article className="panel writer-card">
          <div className="writer-card-head"><div><span className="writer-step">02</span><div><p className="eyebrow">CONFLICT ENGINE</p><h3>캐릭터와 갈등</h3></div></div><RefreshCw size={17} /></div>
          <div className="writer-form">{storyFields.slice(2).map((field) => <StoryField key={String(field.key)} label={field.label} prompt={field.prompt} wide={field.wide} value={String(episode[field.key] ?? '')} onChange={(value) => onUpdateEpisode({ [field.key]: value })} />)}</div>
        </article>

        <article className="panel writer-card beat-card">
          <div className="writer-card-head"><div><span className="writer-step">03</span><div><p className="eyebrow">CONNECTED 8-SECOND CLIPS</p><h3>연속 장면 비트 시트</h3></div></div><span className="writer-duration">{beats.length}장면 · {beats.length * 8}초</span></div>
          <div className="beat-timeline">{beats.map((beat, index) => <BeatEditor key={beat.id} beat={beat} index={index} onChange={(patch) => updateBeat(beat.id, patch)} />)}</div>
        </article>
      </div>

      <aside className="writer-review panel">
        <div className="review-head"><div><p className="eyebrow">STORY EDITOR</p><h3>작가 검수</h3></div><ShieldCheck size={20} /></div>
        {issues.length ? <div className="issue-list">{issues.map((issue) => <div className={`story-issue ${issue.level}`} key={issue.code}><AlertCircle size={15} /><span>{issue.message}</span></div>)}</div> : <div className="review-pass"><CheckCircle2 size={32} /><strong>기본 구조 통과</strong><p>장면 작업실에서 대사와 연출을 다듬을 준비가 됐습니다.</p></div>}
        <div className="editor-rules"><strong>편집자의 확인 기준</strong><span>주인공의 목표가 보이는가?</span><span>문제가 점점 커지는가?</span><span>마지막에 감정이 달라지는가?</span><span>첫 2초가 설명 없이 이해되는가?</span></div>
        <button className="primary-button writer-cta" onClick={createScenes} disabled={hasRequiredIssues || !beats.some((beat) => beat.content.trim())} title={hasRequiredIssues ? '필수 검수 항목을 먼저 채워주세요.' : undefined}><Clapperboard size={17} /> 비트 시트로 장면 초안 만들기</button>
        <button className="secondary-button writer-secondary" onClick={() => onOpenStudio()}>기존 장면 작업실 열기 <ArrowRight size={15} /></button>
      </aside>
    </div>
  </section>;
}

function StoryField({ label, prompt, value, onChange, wide }: { label: string; prompt: string; value: string; onChange: (value: string) => void; wide?: boolean }) {
  return <label className={wide ? 'writer-field full' : 'writer-field'}><span>{label}</span><textarea value={value} placeholder={prompt} onChange={(event) => onChange(event.target.value)} /></label>;
}

function BeatEditor({ beat, index, onChange }: { beat: StoryBeat; index: number; onChange: (patch: Partial<StoryBeat>) => void }) {
  return <div className={`beat-row beat-${beat.kind}`}><div className="beat-marker"><span>{String(index + 1).padStart(2, '0')}</span><i /></div><div className="beat-content"><div><strong>{beat.label}</strong><em>{beat.timeRange}</em></div><small>{beat.purpose}</small><textarea value={beat.content} placeholder={`${beat.label}에서 실제로 벌어지는 일을 적어주세요.`} onChange={(event) => onChange({ content: event.target.value })} /><textarea className="continuity-note" value={beat.continuityOut ?? ''} placeholder="8초 끝의 위치·자세·시선·의상·소품·감정" onChange={(event) => onChange({ continuityOut: event.target.value })} /></div></div>;
}
