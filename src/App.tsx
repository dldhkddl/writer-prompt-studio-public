import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, BookOpen, Boxes, Check, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, Download, FileText, LayoutDashboard, Lightbulb, PenTool, Plus, Route, Settings2, Sparkles, Trash2, Users, WandSparkles } from 'lucide-react';
import { deleteCharacterImage, loadCharacterImage, saveCharacterImage } from './image-store';
import { loadProjectState, saveProject } from './storage';
import { createDefaultBeats } from './story-structure';
import type { Character, Episode, Project, Scene, SeriesPlan, World } from './types';
import WriterRoom from './WriterRoom';
import CharacterAppearancePanel from './CharacterAppearancePanel';
import { getNextCharacterIdAfterDeletion, patchCharacterInProject } from './project-updates';
import { scheduleCharacterDeletion } from './character-deletion';
import HiggsfieldPromptPanel from './HiggsfieldPromptPanel';
import { deleteEpisodeAndChooseNext } from './episode-deletion';
import { moveSceneAndInvalidateFollowing, patchSceneAndInvalidateFollowing } from './scene-updates';
import SeriesRoom from './SeriesRoom';
import SceneReferencePanel from './SceneReferencePanel';
import { approveSeriesProposal } from './series-engine';
import './styles.css';
import './studio-layout-fix.css';
import './dashboard.css';
import './character-delete.css';
import './workplace.css';
import './character-options.css';

type Tab = 'dashboard' | 'characters' | 'world' | 'series' | 'writing' | 'studio' | 'trends';
const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: '작업 개요', icon: LayoutDashboard }, { id: 'characters', label: '캐릭터 보관함', icon: Users }, { id: 'world', label: '세계관 · 관계', icon: Boxes }, { id: 'series', label: '연재 자동 작가', icon: Route }, { id: 'writing', label: '시나리오 설계', icon: PenTool }, { id: 'studio', label: '장면 작업실', icon: Clapperboard }, { id: 'trends', label: '트렌드 메모', icon: Lightbulb },
];

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const blankCharacter = (): Character => ({ id: uid('캐릭터'), name: '새 캐릭터', type: 'animal', gender: 'unspecified', behaviorStyle: 'humanlike', appearance: '', personality: '', voice: '', habits: '', likes: '', dislikes: '' });
const blankScene = (): Scene => ({ id: uid('장면'), title: '새 장면', timeRange: '8초', continuityIn: '', continuityOut: '', action: '', dialogue: '', camera: '세로형 9:16, 자연스러운 카메라', mood: '현실적인 코미디', negativePrompt: '얼굴 변형, 캐릭터 외형 변경, 손발 오류 금지' });

export default function App() {
  const [initialLoad] = useState(() => loadProjectState());
  const [project, setProject] = useState<Project>(initialLoad.project);
  const projectRef = useRef(project);
  projectRef.current = project;
  const [tab, setTab] = useState<Tab>('dashboard');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(project.episodes[0]?.id ?? '');
  const [selectedSceneId, setSelectedSceneId] = useState(project.episodes[0]?.scenes[0]?.id ?? '');
  const [imageStorageReady, setImageStorageReady] = useState(false);
  const [imageStorageWarning, setImageStorageWarning] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all(project.characters.map(async (character) => {
      if (character.imageDataUrl) {
        await saveCharacterImage(character.id, character.imageDataUrl);
        return { id: character.id, imageDataUrl: character.imageDataUrl };
      }
      return { id: character.id, imageDataUrl: await loadCharacterImage(character.id) };
    })).then((images) => {
      if (!active || !images.some((image) => image.imageDataUrl)) return;
      setProject((current) => ({ ...current, characters: current.characters.map((character) => ({ ...character, imageDataUrl: images.find((image) => image.id === character.id)?.imageDataUrl ?? character.imageDataUrl })) }));
    }).then(() => { if (active) setImageStorageReady(true); }).catch(() => { if (active) setImageStorageWarning('이미지 저장소를 사용할 수 없어 기존 사진을 프로젝트 데이터에 보존하고 있습니다.'); });
    return () => { active = false; };
  }, []);
  const episode = project.episodes.find((item) => item.id === selectedEpisodeId) ?? project.episodes[0];
  const scene = episode?.scenes.find((item) => item.id === selectedSceneId) ?? episode?.scenes[0];

  const commit = (next: Project): boolean => { const result = saveProject(next, { preserveImages: !imageStorageReady }); if (!result.ok) { window.alert(result.message); return false; } projectRef.current = next; setProject(next); return true; };
  const updateEpisode = (patch: Partial<Episode>) => { if (!episode) return; commit({ ...project, episodes: project.episodes.map((item) => item.id === episode.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) }); };
  const updateScene = (patch: Partial<Scene>) => { if (!episode || !scene) return; updateEpisode({ scenes: patchSceneAndInvalidateFollowing(episode.scenes, scene.id, patch) }); };
  const addCharacter = () => { const character = blankCharacter(); commit({ ...project, characters: [...project.characters, character] }); setTab('characters'); return character; };
  const updateCharacter = (id: string, patch: Partial<Character>) => commit(patchCharacterInProject(projectRef.current, id, patch));
  const deleteCharacter = async (id: string): Promise<boolean> => scheduleCharacterDeletion({
    project: projectRef.current,
    characterId: id,
    persistProject: commit,
    deleteImage: deleteCharacterImage,
    onImageCleanupError: () => window.alert('캐릭터는 삭제했지만 등록 사진 정리를 완료하지 못했습니다.'),
  });
  const addEpisode = () => { const next: Episode = { id: uid('에피소드'), title: '새 에피소드', idea: '새로운 이야기를 시작해보세요.', characterIds: project.characters.slice(0, 1).map((item) => item.id), scenes: [blankScene()], beats: createDefaultBeats(), status: 'draft', updatedAt: new Date().toISOString() }; commit({ ...project, episodes: [...project.episodes, next] }); setSelectedEpisodeId(next.id); setSelectedSceneId(next.scenes[0].id); setTab('writing'); };
  const deleteEpisode = async (id: string): Promise<boolean> => {
    const result = deleteEpisodeAndChooseNext(projectRef.current, id, commit);
    if (!result.deleted) return false;
    setSelectedEpisodeId(result.episodeId);
    setSelectedSceneId(result.sceneId);
    return true;
  };
  const moveScene = (direction: -1 | 1) => { if (!episode || !scene) return; updateEpisode({ scenes: moveSceneAndInvalidateFollowing(episode.scenes, scene.id, direction) }); };
  const updateSeriesPlan = (plan: SeriesPlan) => commit({ ...projectRef.current, seriesPlan: plan });
  const approveProposal = (proposalId: string) => {
    try {
      const result = approveSeriesProposal(projectRef.current, proposalId, new Date().toISOString());
      if (!commit(result.project)) return;
      setSelectedEpisodeId(result.episodeId);
      setSelectedSceneId(result.sceneId);
      setTab('writing');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '연재 후보를 확정하지 못했습니다.');
    }
  };
  const downloadRecovery = () => { if (!initialLoad.recoveryRaw) return; const blob = new Blob([initialLoad.recoveryRaw], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = '작가-프롬프트-복구본.json'; link.click(); URL.revokeObjectURL(url); };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><WandSparkles size={18} /></div><div><strong>작가 프롬프트</strong><span>STUDIO</span></div></div>
      <div className="workspace-label">내 작업실</div>
      <nav>{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'nav-item active' : 'nav-item'} onClick={() => setTab(id)}><Icon size={17} /><span>{label}</span>{id === 'studio' && <em>{project.episodes.length}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="storage-status"><span className="status-dot" />로컬에 자동 저장 중</div><button className="nav-item muted"><Settings2 size={17} /><span>작업실 설정</span></button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><p className="eyebrow">CREATIVE WORKSPACE / 01</p><h1>캐릭터 세계관 프로젝트 <span className="chevron"><ChevronDown size={16} /></span></h1></div><div className="top-actions"><span className={imageStorageWarning ? 'saved warning' : 'saved'}><Check size={14} /> {imageStorageWarning || '저장됨'}</span><button className="avatar">이</button></div></header>
      {initialLoad.recoveryRaw && <div className="recovery-banner"><AlertCircle size={18} /><span><strong>이전 저장 데이터를 정상적으로 읽지 못했습니다.</strong><small>{initialLoad.warning}</small></span><button className="secondary-button" onClick={downloadRecovery}><Download size={16} /> 원본 복구본 받기</button></div>}
      {tab === 'dashboard' && <Dashboard project={project} onTab={setTab} onNewEpisode={addEpisode} />}
      {tab === 'characters' && <Characters project={project} onAdd={addCharacter} onUpdate={updateCharacter} onDelete={deleteCharacter} />}
      {tab === 'world' && <WorldView project={project} onUpdateWorlds={(worlds) => commit({ ...project, worlds })} onUpdateRelationships={(relationships) => commit({ ...project, relationships })} />}
      {tab === 'series' && <SeriesRoom project={project} onUpdatePlan={updateSeriesPlan} onApproveProposal={approveProposal} />}
      {tab === 'writing' && episode && <WriterRoom project={project} episode={episode} onSelectEpisode={(id) => { setSelectedEpisodeId(id); const next = project.episodes.find((item) => item.id === id); setSelectedSceneId(next?.scenes[0]?.id ?? ''); }} onUpdateEpisode={updateEpisode} onOpenStudio={(sceneId) => { setSelectedSceneId(sceneId ?? episode.scenes[0]?.id ?? ''); setTab('studio'); }} onDeleteEpisode={deleteEpisode} onUpdatePlan={updateSeriesPlan} onApproveProposal={approveProposal} />}
      {tab === 'writing' && !episode && <EmptyWriting onNewEpisode={addEpisode} />}
      {tab === 'trends' && <Trends project={project} />}
      {tab === 'studio' && episode && scene && <Studio project={project} episode={episode} scene={scene} onSelectEpisode={(id) => { setSelectedEpisodeId(id); const next = project.episodes.find((item) => item.id === id); setSelectedSceneId(next?.scenes[0]?.id ?? ''); }} onSelectScene={setSelectedSceneId} onUpdateEpisode={updateEpisode} onUpdateScene={updateScene} onAddScene={() => { const next = [...episode.scenes, blankScene()]; updateEpisode({ scenes: next }); setSelectedSceneId(next[next.length - 1].id); }} onMoveScene={moveScene} onNewEpisode={addEpisode} />}
      {tab === 'studio' && episode && !scene && <EmptyStudio onAddScene={() => { const next = blankScene(); updateEpisode({ scenes: [next] }); setSelectedSceneId(next.id); }} onOpenWriting={() => setTab('writing')} />}
      {tab === 'studio' && !episode && <EmptyProjectStudio onNewEpisode={addEpisode} />}
    </main>
  </div>;
}

function Dashboard({ project, onTab, onNewEpisode }: { project: Project; onTab: (tab: Tab) => void; onNewEpisode: () => void }) {
  const current = project.episodes[0];
  return <section className="page dashboard"><div className="hero-row hero-row-simple"><div><p className="eyebrow accent">GOOD STORIES START HERE</p><h2>오늘의 이야기를<br /><span>장면으로 만들어보세요.</span></h2><p className="hero-copy">캐릭터의 설정을 기억하는 작가실에서<br />힉스필드용 프롬프트까지 한 번에.</p><button className="primary-button" onClick={onNewEpisode}><Plus size={18} /> 새 에피소드 시작</button></div></div>
    <div className="section-heading"><div><p className="eyebrow">AT A GLANCE</p><h3>작업실 현황</h3></div><button className="text-button" onClick={() => onTab('studio')}>에피소드 모두 보기 <ChevronRight size={15} /></button></div>
    <div className="stats-grid"><Stat icon={<Users />} label="등록 캐릭터" value={`${project.characters.length}`} suffix="명" tone="lavender" /><Stat icon={<BookOpen />} label="진행 중 에피소드" value={`${project.episodes.filter((episode) => episode.status === 'draft').length}`} suffix="편" tone="peach" /><Stat icon={<FileText />} label="작성한 장면" value={`${project.episodes.reduce((sum, episode) => sum + episode.scenes.length, 0)}`} suffix="개" tone="mint" /><Stat icon={<Lightbulb />} label="트렌드 메모" value={`${project.trends.length}`} suffix="개" tone="yellow" /></div>
    <div className="bottom-grid"><div className="panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">RECENT WORK</p><h3>최근 작업</h3></div><button className="icon-button"><Settings2 size={16} /></button></div>{current && <button className="recent-item" onClick={() => onTab('studio')}><div className="recent-thumb">🐕</div><div><strong>{current.title}</strong><span>{current.scenes.length}개 장면 · 초안</span></div><ChevronRight size={18} /></button>}</div><div className="panel quick-panel"><div className="panel-heading"><div><p className="eyebrow">QUICK START</p><h3>작가 도구</h3></div></div><div className="quick-list"><button onClick={() => onTab('characters')}><span className="quick-icon lavender"><Users size={17} /></span><span><strong>캐릭터 등록하기</strong><small>사진과 성격으로 캐릭터 만들기</small></span><Plus size={16} /></button><button onClick={() => onTab('world')}><span className="quick-icon peach"><Boxes size={17} /></span><span><strong>세계관 정리하기</strong><small>이야기의 규칙과 관계 설정</small></span><Plus size={16} /></button></div></div></div>
  </section>;
}
function Stat({ icon, label, value, suffix, tone }: { icon: React.ReactNode; label: string; value: string; suffix: string; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><span>{label}</span><strong>{value}<small>{suffix}</small></strong></div>; }

export function Characters({ project, onAdd, onUpdate, onDelete }: { project: Project; onAdd: () => Character; onUpdate: (id: string, patch: Partial<Character>) => void; onDelete: (id: string) => Promise<boolean> }) {
  const [selectedId, setSelectedId] = useState<string | undefined>(project.characters[0]?.id);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);
  const selectionRevision = useRef(0);
  const selected = project.characters.find((character) => character.id === selectedId) ?? project.characters[0];
  const addAndSelect = () => { const character = onAdd(); selectionRevision.current += 1; setSelectedId(character.id); };
  const selectCharacter = (id: string) => { selectionRevision.current += 1; setSelectedId(id); setConfirmingDeleteId(undefined); };
  const confirmDelete = async () => {
    if (!selected || confirmingDeleteId !== selected.id || isDeleting) return;
    const deletedId = selected.id;
    const nextSelectedId = getNextCharacterIdAfterDeletion(project.characters, deletedId);
    const selectionAtStart = selectionRevision.current;
    setIsDeleting(true);
    try {
      if (await onDelete(deletedId)) {
        if (selectionRevision.current === selectionAtStart) setSelectedId(nextSelectedId);
        setConfirmingDeleteId(undefined);
      }
    } finally {
      setIsDeleting(false);
    }
  };
  return <section className="page">
    <PageTitle eyebrow="CHARACTER BIBLE" title="캐릭터 보관함" description="사진 한 장으로 시작해, 이야기를 끌고 갈 캐릭터를 만들어보세요." action={<button className="primary-button small" onClick={addAndSelect}><Plus size={16} /> 캐릭터 추가</button>} />
    <div className="characters-layout">
      <div className="character-list">
        {project.characters.map((character) => <button key={character.id} className={character.id === selected?.id ? 'character-list-item selected' : 'character-list-item'} onClick={() => selectCharacter(character.id)}><div className="mini-avatar">{character.imageDataUrl ? <img src={character.imageDataUrl} alt="" /> : '🐶'}</div><span><strong>{character.name}</strong><small>{character.type === 'animal' ? '동물 캐릭터' : '일반 캐릭터'}</small></span><ChevronRight size={15} /></button>)}
        <button className="add-dashed" onClick={addAndSelect}><Plus size={17} /> 새 캐릭터</button>
      </div>
      {selected && <div className="panel character-editor">
        <div className="editor-head"><div className="profile-large">{selected.imageDataUrl ? <img src={selected.imageDataUrl} alt="캐릭터 기준 이미지" /> : <span>🐶</span>}</div><div><span className="pill lavender-pill">{selected.type === 'animal' ? 'ANIMAL CHARACTER' : 'CHARACTER'}</span><h3>{selected.name}</h3><p>이 설정은 모든 장면 프롬프트에 반영됩니다.</p></div></div>
        <div className="form-grid"><Field label="이름" value={selected.name} onChange={(value) => onUpdate(selected.id, { name: value })} /><CharacterTypeField value={selected.type} onChange={(type) => onUpdate(selected.id, { type })} /><Field wide label="외형 특징" value={selected.appearance} placeholder="직접 작성하거나 Sol의 제안을 적용하세요" onChange={(value) => onUpdate(selected.id, { appearance: value })} /><Field wide label="성격" value={selected.personality} placeholder="이 캐릭터는 어떤 성격인가요?" onChange={(value) => onUpdate(selected.id, { personality: value })} /><Field label="말투" value={selected.voice} placeholder="예: 해맑고 짧게 말함" onChange={(value) => onUpdate(selected.id, { voice: value })} /><Field label="반복 행동" value={selected.habits} placeholder="예: 긴장하면 꼬리를 흔듦" onChange={(value) => onUpdate(selected.id, { habits: value })} /><Field label="좋아하는 것" value={selected.likes} onChange={(value) => onUpdate(selected.id, { likes: value })} /><Field label="싫어하는 것" value={selected.dislikes} onChange={(value) => onUpdate(selected.id, { dislikes: value })} /></div>
        <CharacterOptions character={selected} onUpdate={(patch) => onUpdate(selected.id, patch)} />
        <CharacterAppearancePanel key={selected.id} character={selected} onUpdate={(patch) => onUpdate(selected.id, patch)} />
        <div className="character-delete-zone">
          {confirmingDeleteId !== selected.id
            ? <button className="danger-button" onClick={() => setConfirmingDeleteId(selected.id)}><Trash2 size={16} /> 캐릭터 삭제</button>
            : <div className="delete-confirmation" role="alert"><AlertCircle size={19} /><div><strong>‘{selected.name}’ 캐릭터를 삭제할까요?</strong><p>등록 사진과 관계, 에피소드·장면의 출연 정보도 함께 정리되며 되돌릴 수 없습니다.</p><div className="delete-confirmation-actions"><button className="secondary-button" disabled={isDeleting} onClick={() => setConfirmingDeleteId(undefined)}>취소</button><button className="danger-button solid" disabled={isDeleting} onClick={confirmDelete}><Trash2 size={15} /> {isDeleting ? '삭제 중…' : '삭제하기'}</button></div></div></div>}
        </div>
      </div>}
      {!selected && <div className="panel character-empty"><Users size={28} /><h3>아직 등록된 캐릭터가 없어요.</h3><p>새 캐릭터를 추가해 첫 이야기를 시작해보세요.</p><button className="primary-button" onClick={addAndSelect}><Plus size={16} /> 새 캐릭터 추가</button></div>}
    </div>
  </section>;
}

function WorldView({ project, onUpdateWorlds, onUpdateRelationships }: { project: Project; onUpdateWorlds: (worlds: World[]) => void; onUpdateRelationships: (relationships: Project['relationships']) => void }) {
  const world = project.worlds[0];
  const workplace = world?.workplace ?? { companyName: '', industry: '', department: '', role: '', duties: '' };
  const updateWorld = (patch: Partial<World>) => { if (world) onUpdateWorlds(project.worlds.map((item) => item.id === world.id ? { ...item, ...patch } : item)); };
  const updateWorkplace = (patch: Partial<NonNullable<World['workplace']>>) => updateWorld({ workplace: { ...workplace, ...patch } });
  const addRelationship = () => {
    if (project.characters.length < 2) { window.alert('관계를 만들려면 캐릭터가 두 명 이상 필요합니다.'); return; }
    onUpdateRelationships([...project.relationships, { id: uid('관계'), fromCharacterId: project.characters[0].id, toCharacterId: project.characters[1].id, kind: '친구', description: '' }]);
  };
  const updateRelationship = (id: string, patch: Partial<Project['relationships'][number]>) => onUpdateRelationships(project.relationships.map((item) => item.id === id ? { ...item, ...patch } : item));
  const removeRelationship = (id: string) => onUpdateRelationships(project.relationships.filter((item) => item.id !== id));
  return <section className="page">
    <PageTitle eyebrow="WORLD BUILDING" title="세계관 · 관계" description="캐릭터들이 살아가는 무대와 서로의 감정을 정리합니다." action={<button className="secondary-button" onClick={addRelationship}><Plus size={16} /> 관계 추가</button>} />
    <div className="world-layout">
      <div className="panel world-editor">
        <div className="panel-heading"><div><p className="eyebrow">WORLD NOTE</p><h3>{world?.name ?? '새 세계관'}</h3></div><span className="status-badge">사용 중</span></div>
        {world && <div className="form-grid">
          <Field label="세계관 이름" value={world.name} onChange={(value) => updateWorld({ name: value })} />
          <Field label="기본 분위기" value={world.tone} onChange={(value) => updateWorld({ tone: value })} />
          <Field wide label="시간과 장소" value={world.setting} onChange={(value) => updateWorld({ setting: value })} />
          <label className="field wide"><span>세계관 규칙</span><textarea value={world.rules.join('\n')} onChange={(event) => updateWorld({ rules: event.target.value.split('\n') })} /></label>
          <div className="workplace-heading"><div><p className="eyebrow">FIXED WORKPLACE</p><strong>직장 설정</strong></div><span>승인 없이 다른 직장 설정으로 변경하지 않음</span></div>
          <Field label="회사명" value={workplace.companyName} placeholder="미정이면 임의 이름을 만들지 않음" onChange={(value) => updateWorkplace({ companyName: value })} />
          <Field label="회사 업종" value={workplace.industry} onChange={(value) => updateWorkplace({ industry: value })} />
          <Field label="소속 부서" value={workplace.department} onChange={(value) => updateWorkplace({ department: value })} />
          <Field label="직급·역할" value={workplace.role} onChange={(value) => updateWorkplace({ role: value })} />
          <Field wide label="담당 업무" value={workplace.duties} onChange={(value) => updateWorkplace({ duties: value })} />
        </div>}
      </div>
      <div className="panel relationship-panel">
        <div className="panel-heading"><div><p className="eyebrow">CHARACTER RELATIONSHIPS</p><h3>관계 지도</h3></div><Users size={20} className="muted-icon" /></div>
        {project.characters.length < 2
          ? <div className="empty-state"><div className="empty-orbit">✦</div><strong>아직 관계를 만들 수 없어요</strong><p>캐릭터를 한 명 더 추가하면<br />이야기 속 관계를 연결할 수 있어요.</p></div>
          : project.relationships.length
            ? <div className="relationship-list">{project.relationships.map((relationship) => <div className="relationship-card" key={relationship.id}><div className="relationship-people"><label><span>출발 캐릭터</span><select value={relationship.fromCharacterId} onChange={(event) => updateRelationship(relationship.id, { fromCharacterId: event.target.value })}>{project.characters.map((character) => <option value={character.id} key={character.id}>{character.name}</option>)}</select></label><ArrowRight size={15} /><label><span>상대 캐릭터</span><select value={relationship.toCharacterId} onChange={(event) => updateRelationship(relationship.id, { toCharacterId: event.target.value })}>{project.characters.map((character) => <option value={character.id} key={character.id}>{character.name}</option>)}</select></label><button className="icon-button" title="관계 삭제" onClick={() => removeRelationship(relationship.id)}><Trash2 size={15} /></button></div><div className="form-grid"><Field label="관계 유형" value={relationship.kind} placeholder="예: 친구, 라이벌, 보호자" onChange={(value) => updateRelationship(relationship.id, { kind: value })} /><Field label="관계 설명" value={relationship.description} placeholder="둘 사이의 감정과 긴장" onChange={(value) => updateRelationship(relationship.id, { description: value })} /></div></div>)}</div>
            : <div className="empty-state"><div className="empty-orbit">↔</div><strong>첫 관계를 연결해보세요</strong><p>관계는 장면의 대사와 갈등,<br />최종 프롬프트에 함께 반영됩니다.</p><button className="text-button" onClick={addRelationship}>관계 추가하기 <ChevronRight size={15} /></button></div>}
      </div>
    </div>
  </section>;
}

function Trends({ project }: { project: Project }) { return <section className="page"><PageTitle eyebrow="TREND NOTEBOOK" title="트렌드 메모" description="유행을 따라가기보다, 근거를 확인하고 이야기의 결에 맞게 기록합니다." action={<button className="secondary-button"><Plus size={16} /> 메모 추가</button>} /><div className="source-banner"><div className="source-symbol"><Lightbulb size={20} /></div><div><strong>출처가 있는 트렌드만 사용해요.</strong><p>공식 보고서, 실제 콘텐츠 반응, 작가의 아이디어를 구분해서 저장합니다.</p></div><span className="source-rule">SOURCE FIRST</span></div><div className="trend-grid">{project.trends.map((trend) => <article className="panel trend-card" key={trend.id}><div className="trend-top"><span className="pill mint-pill">{trend.platform}</span><span>{trend.checkedAt}</span></div><h3>{trend.title}</h3><p>{trend.note}</p><a href={trend.sourceUrl} target="_blank" rel="noreferrer">출처 열기 <ChevronRight size={14} /></a></article>)}</div></section>; }

function Studio({ project, episode, scene, onSelectEpisode, onSelectScene, onUpdateEpisode, onUpdateScene, onAddScene, onMoveScene, onNewEpisode }: { project: Project; episode: Episode; scene: Scene; onSelectEpisode: (id: string) => void; onSelectScene: (id: string) => void; onUpdateEpisode: (patch: Partial<Episode>) => void; onUpdateScene: (patch: Partial<Scene>) => void; onAddScene: () => void; onMoveScene: (direction: -1 | 1) => void; onNewEpisode: () => void }) {
  const sceneCast = scene.characterIds ?? episode.characterIds;
  return <section className="page studio-page"><div className="studio-head"><div><p className="eyebrow accent">EPISODE WORKSHOP</p><div className="episode-select"><select value={episode.id} onChange={(event) => onSelectEpisode(event.target.value)}>{project.episodes.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select><ChevronDown size={16} /></div><p className="studio-sub">장면마다 8초 · 예상 전체 길이 {episode.scenes.length * 8}초</p></div><button className="secondary-button" onClick={onNewEpisode}><Plus size={16} /> 새 에피소드</button></div><div className="studio-layout"><div className="scene-column"><div className="episode-idea panel"><div className="panel-heading"><div><span className="pill peach-pill">EPISODE IDEA</span><h3>이번 화의 한 줄</h3></div><Sparkles size={18} className="accent-icon" /></div><textarea value={episode.idea} onChange={(event) => onUpdateEpisode({ idea: event.target.value })} /></div><div className="scenes-heading"><div><p className="eyebrow">SCENE BOARD</p><h3>장면 구성 <span>{episode.scenes.length} · {episode.scenes.length * 8}초</span></h3></div><div className="scene-controls"><button className="icon-button" onClick={() => onMoveScene(-1)} title="앞으로 이동"><ChevronLeft size={16} /></button><button className="icon-button" onClick={() => onMoveScene(1)} title="뒤로 이동"><ChevronRight size={16} /></button></div></div><div className="scene-list">{episode.scenes.map((item, index) => <button key={item.id} className={item.id === scene.id ? 'scene-card selected' : 'scene-card'} onClick={() => onSelectScene(item.id)}><span className="scene-number">{String(index + 1).padStart(2, '0')}</span><span className="scene-copy"><strong>{item.title}</strong><small>8초 · {item.action || '장면의 행동을 입력하세요'}</small></span><ChevronRight size={17} /></button>)}<button className="add-scene" onClick={onAddScene}><Plus size={16} /> 장면 추가</button></div></div><div className="scene-editor-column"><div className="panel scene-editor"><div className="editor-title"><div><span className="pill lavender-pill">SCENE {String(episode.scenes.findIndex((item) => item.id === scene.id) + 1).padStart(2, '0')}</span><h3>장면 디렉터</h3></div><span className="ai-label"><Sparkles size={13} /> 설정 자동 반영</span></div><div className="form-grid"><Field label="장면 제목" value={scene.title} onChange={(value) => onUpdateScene({ title: value })} /><Field label="클립 길이" value="8초" onChange={() => undefined} readOnly /></div><div className="scene-cast"><span>이 장면의 출연 캐릭터</span><div className="scene-cast-list">{project.characters.filter((character) => episode.characterIds.includes(character.id)).map((character) => { const selected = sceneCast.includes(character.id); return <label className={selected ? 'cast-chip selected' : 'cast-chip'} key={character.id}><input type="checkbox" checked={selected} onChange={() => onUpdateScene({ characterIds: selected ? sceneCast.filter((id) => id !== character.id) : [...sceneCast, character.id] })} />{character.name}</label>; })}</div></div><Field wide label="장면 목적" value={scene.purpose ?? ''} placeholder="이 장면이 이야기에서 해야 하는 일" onChange={(value) => onUpdateScene({ purpose: value })} /><Field wide label="앞 장면에서 이어받을 상태" value={scene.continuityIn ?? ''} placeholder="위치·자세·시선·의상·소품·감정" onChange={(value) => onUpdateScene({ continuityIn: value })} textarea /><Field wide label="행동과 상황" value={scene.action} placeholder="이 장면에서 캐릭터가 무엇을 하나요?" onChange={(value) => onUpdateScene({ action: value })} textarea /><Field wide label="대사" value={scene.dialogue} placeholder="실제로 말할 대사만 적어주세요. 머뭇거림은 행동과 상황에 적어주세요." onChange={(value) => onUpdateScene({ dialogue: value })} textarea /><Field wide label="다음 장면으로 넘길 마지막 상태" value={scene.continuityOut ?? ''} placeholder="8초 끝의 위치·자세·시선·소품·감정" onChange={(value) => onUpdateScene({ continuityOut: value })} textarea /><div className="form-grid"><Field label="시작 감정" value={scene.emotionBefore ?? ''} placeholder="예: 불안" onChange={(value) => onUpdateScene({ emotionBefore: value })} /><Field label="도착 감정" value={scene.emotionAfter ?? ''} placeholder="예: 안도" onChange={(value) => onUpdateScene({ emotionAfter: value })} /><Field label="카메라 연출" value={scene.camera} onChange={(value) => onUpdateScene({ camera: value })} /><Field label="분위기" value={scene.mood} onChange={(value) => onUpdateScene({ mood: value })} /></div><Field wide label="부정 프롬프트" value={scene.negativePrompt} onChange={(value) => onUpdateScene({ negativePrompt: value })} /></div><SceneReferencePanel project={project} episode={episode} scene={scene} onUpdateScene={onUpdateScene} /><HiggsfieldPromptPanel project={project} episode={episode} scene={scene} onUpdateScene={onUpdateScene} /></div></div></section>;
}

function EmptyStudio({ onAddScene, onOpenWriting }: { onAddScene: () => void; onOpenWriting: () => void }) {
  return <section className="page empty-studio"><div className="panel empty-studio-card"><div className="empty-studio-icon"><Clapperboard size={28} /></div><p className="eyebrow accent">SCENE BOARD</p><h2>아직 작업할 장면이 없어요.</h2><p>시나리오 설계에서 7단계 이야기 비트를 장면으로 만들거나, 빈 장면부터 직접 시작할 수 있습니다.</p><div className="empty-studio-actions"><button className="primary-button" onClick={onOpenWriting}><PenTool size={17} /> 시나리오 설계로 이동</button><button className="secondary-button" onClick={onAddScene}><Plus size={16} /> 빈 장면 추가</button></div></div></section>;
}

function EmptyProjectStudio({ onNewEpisode }: { onNewEpisode: () => void }) {
  return <section className="page empty-studio"><div className="panel empty-studio-card"><div className="empty-studio-icon"><BookOpen size={28} /></div><p className="eyebrow accent">FIRST EPISODE</p><h2>첫 에피소드부터 만들어볼까요?</h2><p>에피소드를 만들면 시나리오 작가 모드에서 캐릭터 목표와 갈등, 7단계 비트를 설계할 수 있습니다.</p><button className="primary-button" onClick={onNewEpisode}><Plus size={17} /> 첫 에피소드 만들기</button></div></section>;
}

function EmptyWriting({ onNewEpisode }: { onNewEpisode: () => void }) {
  return <section className="page empty-studio"><div className="panel empty-studio-card"><div className="empty-studio-icon"><PenTool size={28} /></div><p className="eyebrow accent">WRITER'S ROOM</p><h2>아직 에피소드가 없어요.</h2><p>새 에피소드를 만들면 캐릭터 목표와 갈등부터 장면별 실행 프롬프트까지 이어서 만들 수 있습니다.</p><button className="primary-button" onClick={onNewEpisode}><Plus size={17} /> 새 에피소드 만들기</button></div></section>;
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="page-title"><div><p className="eyebrow accent">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>{action}</div>; }
function Field({ label, value, onChange, placeholder, wide, textarea, readOnly }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; wide?: boolean; textarea?: boolean; readOnly?: boolean }) { return <label className={wide ? 'field wide' : 'field'}><span>{label}</span>{textarea ? <textarea value={value} placeholder={placeholder} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} /> : <input value={value} placeholder={placeholder} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} />}</label>; }
function CharacterTypeField({ value, onChange }: { value: Character['type']; onChange: (value: Character['type']) => void }) { return <label className="field"><span>캐릭터 유형</span><select value={value} onChange={(event) => onChange(event.target.value as Character['type'])}><option value="animal">동물</option><option value="human">사람</option><option value="creature">가상 생명체</option><option value="mascot">마스코트</option><option value="other">기타</option></select></label>; }
function CharacterOptions({ character, onUpdate }: { character: Character; onUpdate: (patch: Partial<Character>) => void }) {
  return <div className="form-grid character-options">
    <label className="field"><span>성별·목소리</span><select value={character.gender ?? 'unspecified'} onChange={(event) => onUpdate({ gender: event.target.value as NonNullable<Character['gender']> })}><option value="female">여성</option><option value="male">남성</option><option value="neutral">중성</option><option value="unspecified">지정 안 함</option></select></label>
    <label className="field"><span>행동 방식</span><select value={character.behaviorStyle ?? 'humanlike'} onChange={(event) => onUpdate({ behaviorStyle: event.target.value as NonNullable<Character['behaviorStyle']> })}><option value="humanlike">사람처럼 행동</option><option value="animal">동물처럼 행동</option><option value="mixed">혼합</option></select></label>
    <p className="character-options-note">성별은 목소리 성별과 음색을 고정하고, 행동 방식은 직립 보행·몸짓·도구 사용을 모든 영상 프롬프트에 고정합니다.</p>
  </div>;
}
