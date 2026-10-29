import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCodexStatus, requestStoryDraft } from './codex-client';

afterEach(() => vi.unstubAllGlobals());

const completeBeats = ['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next'].map((kind) => ({ kind, content: `${kind} 내용` }));

describe('Codex 로컬 클라이언트', () => {
  it('초안 요청에 현재 로컬 세션 키를 포함한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      threadId: 'thread-1',
      draft: {
        logline: '로그라인', theme: '주제', outerGoal: '목표', innerNeed: '필요', flaw: '약점', obstacle: '장애물',
        stakes: '대가', twist: '반전', ending: '결말', nextHook: '연결', beats: completeBeats, editorNotes: [],
      },
      editorNotes: [],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await requestStoryDraft({ episode: {} as never, characters: [], relationships: [] }, 'local-token');

    expect(fetchMock).toHaveBeenCalledWith('/api/codex/story-draft', expect.objectContaining({
      headers: expect.objectContaining({ 'x-codex-request-token': 'local-token' }),
    }));
  });

  it('형식이 잘못된 연결 상태 응답은 거부한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ available: true }), { status: 200 })));

    await expect(getCodexStatus()).rejects.toThrow('Codex 응답 형식이 올바르지 않습니다.');
  });

  it('비어 있거나 종류가 잘못된 비트가 포함된 초안 응답은 거부한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      threadId: 'thread-1',
      draft: {
        logline: '로그라인', theme: '주제', outerGoal: '목표', innerNeed: '필요', flaw: '약점', obstacle: '장애물',
        stakes: '대가', twist: '반전', ending: '결말', nextHook: '연결',
        beats: completeBeats.map((beat, index) => index === 0 ? { kind: 'unknown', content: '' } : beat),
        editorNotes: [],
      },
      editorNotes: [],
    }), { status: 200 })));

    await expect(requestStoryDraft({ episode: {} as never, characters: [], relationships: [] }, 'local-token')).rejects.toThrow('Codex 응답 형식이 올바르지 않습니다.');
  });
});
