import { useState } from 'react';
import { Clapperboard, Download, FileText, LoaderCircle, Printer, WandSparkles } from 'lucide-react';
import { getCodexStatus, requestStoryDraft } from './codex-client';
import { applyCodexDraft, buildIdeaFirstStoryRequest } from './codex-draft';
import { buildFullScriptDownloadText, formatFullScript } from './full-script';
import type { Episode, Project } from './types';
import './full-script.css';

type Props = {
  project: Project;
  episode: Episode;
  onApply: (patch: Partial<Episode>) => void;
  onCreateScenes: () => void;
};

export default function FullScriptPanel({ project, episode, onApply, onCreateScenes }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const generate = async () => {
    if (!episode.idea.trim()) {
      setMessage('한 줄 아이디어를 먼저 입력해 주세요.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const status = await getCodexStatus();
      if (!status.available || !status.authenticated) throw new Error(status.message);
      const result = await requestStoryDraft(buildIdeaFirstStoryRequest(project, episode), status.requestToken);
      const next = applyCodexDraft(episode, result.draft);
      const fullScript = formatFullScript(next.beats ?? []);
      onApply({ ...next, fullScript });
      setMessage('56초 전체 대본을 저장했습니다. 아래에서 바로 수정할 수 있습니다.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : '전체 대본 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([`\uFEFF${buildFullScriptDownloadText(episode)}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${episode.title || '에피소드'}-전체-대본.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <article className="panel full-script-card">
    <div className="full-script-head">
      <div><span className="writer-step"><FileText size={16} /></span><div><p className="eyebrow">MASTER SCRIPT</p><h3>약 1분 전체 대본</h3><small>7개 장면 · 56초</small></div></div>
      <button className="primary-button" type="button" disabled={loading} onClick={() => void generate()}>
        {loading ? <LoaderCircle className="spin" size={16} /> : <WandSparkles size={16} />}{loading ? '전체 대본 집필 중…' : episode.fullScript?.trim() ? '전체 대본 다시 생성' : '전체 대본 생성'}
      </button>
    </div>
    <p className="full-script-description">장면을 따로 쓰기 전에 하나의 이어진 56초 이야기로 읽어보고 직접 다듬으세요.</p>
    <textarea aria-label="약 1분 전체 대본" value={episode.fullScript ?? ''} placeholder="한 줄 아이디어를 입력한 뒤 전체 대본 생성을 눌러주세요." onChange={(event) => onApply({ fullScript: event.target.value })} />
    <pre className="full-script-print">{buildFullScriptDownloadText(episode)}</pre>
    {message && <p className="full-script-message" role="status">{message}</p>}
    <div className="full-script-actions">
      <button className="secondary-button" type="button" disabled={!episode.fullScript?.trim()} onClick={downloadTxt}><Download size={15} /> TXT 저장</button>
      <button className="secondary-button" type="button" disabled={!episode.fullScript?.trim()} onClick={() => window.print()}><Printer size={15} /> PDF 저장</button>
      <button className="primary-button" type="button" disabled={!(episode.beats ?? []).some((beat) => beat.content.trim())} onClick={onCreateScenes}><Clapperboard size={15} /> 7개 장면으로 나누기</button>
    </div>
    <small className="pdf-hint">PDF 저장을 누르면 인쇄 창에서 ‘PDF로 저장’을 선택하면 됩니다.</small>
  </article>;
}
