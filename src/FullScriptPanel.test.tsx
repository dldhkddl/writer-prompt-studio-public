// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FullScriptPanel from './FullScriptPanel';
import type { Episode, Project } from './types';

const mocks = vi.hoisted(() => ({
  getStatus: vi.fn(),
  requestDraft: vi.fn(),
}));

vi.mock('./codex-client', () => ({
  getCodexStatus: mocks.getStatus,
  requestStoryDraft: mocks.requestDraft,
}));

const beatKinds = ['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next'] as const;
const beats = beatKinds.map((kind, index) => ({ id: `b${index}`, kind, label: kind, timeRange: '8초', purpose: '', content: `${kind} 행동`, continuityOut: `${kind} 마지막 상태` }));
const episode: Episode = { id: 'e1', title: '첫인사', idea: '줄라이가 시청자에게 인사한다', characterIds: ['c1'], scenes: [], status: 'draft', updatedAt: '', beats, fullScript: '기존 전체 대본' };
const project: Project = { characters: [{ id: 'c1', name: '줄라이', type: 'animal', appearance: '검은 시바견', personality: '성실하다', voice: '밝은 여성 목소리', habits: '', likes: '', dislikes: '' }], worlds: [], relationships: [], episodes: [episode], trends: [] };

let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLDivElement;

const button = (label: string) => [...host.querySelectorAll('button')].find((item) => item.textContent?.includes(label)) as HTMLButtonElement;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  mocks.getStatus.mockReset().mockResolvedValue({ available: true, authenticated: true, message: 'Codex 연결됨', requestToken: 'token' });
  mocks.requestDraft.mockReset().mockResolvedValue({
    threadId: 't1', editorNotes: [], draft: {
      logline: '새 로그라인', theme: '새 주제', outerGoal: '목표', innerNeed: '필요', flaw: '약점', obstacle: '장애물', stakes: '대가', twist: '반전', ending: '결말', nextHook: '연결',
      beats: beatKinds.map((kind) => ({ kind, content: `${kind} 새 행동`, continuityOut: `${kind} 새 마지막 상태` })), editorNotes: [],
    },
  });
});

afterEach(() => {
  act(() => root?.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe('전체 대본 패널', () => {
  it('저장된 대본을 보여주고 수정 내용을 에피소드에 저장한다', async () => {
    const onApply = vi.fn();
    await act(async () => { root?.render(<FullScriptPanel project={project} episode={episode} onApply={onApply} onCreateScenes={vi.fn()} />); await Promise.resolve(); });
    const textarea = host.querySelector('textarea[aria-label="약 1분 전체 대본"]') as HTMLTextAreaElement;

    expect(textarea.value).toBe('기존 전체 대본');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(textarea, '수정한 전체 대본');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onApply).toHaveBeenLastCalledWith({ fullScript: '수정한 전체 대본' });
  });

  it('Codex가 만든 7개 비트를 56초 전체 대본으로 즉시 저장한다', async () => {
    const onApply = vi.fn();
    await act(async () => { root?.render(<FullScriptPanel project={project} episode={episode} onApply={onApply} onCreateScenes={vi.fn()} />); await Promise.resolve(); });
    await act(async () => { button('전체 대본 다시 생성').click(); await Promise.resolve(); await Promise.resolve(); });

    expect(mocks.requestDraft.mock.calls[0][0].episode).toEqual({ id: 'e1', title: '첫인사', idea: '줄라이가 시청자에게 인사한다' });
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      fullScript: expect.stringContaining('[장면 7 · 48~56초 · next]'),
      logline: '새 로그라인',
      beats: expect.arrayContaining([expect.objectContaining({ kind: 'hook', content: 'hook 새 행동' })]),
    }));
  });

  it('TXT 저장, PDF 저장, 7개 장면 분할 동작을 제공한다', async () => {
    const onCreateScenes = vi.fn();
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const createObjectURL = vi.fn(() => 'blob:script');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await act(async () => { root?.render(<FullScriptPanel project={project} episode={episode} onApply={vi.fn()} onCreateScenes={onCreateScenes} />); await Promise.resolve(); });

    expect(host.querySelector('.full-script-print')?.textContent).toContain('기존 전체 대본');
    act(() => button('TXT 저장').click());
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    act(() => button('PDF 저장').click());
    expect(print).toHaveBeenCalled();
    act(() => button('7개 장면으로 나누기').click());
    expect(onCreateScenes).toHaveBeenCalled();
  });
});
