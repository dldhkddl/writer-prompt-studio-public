import { createServer, request as httpRequest } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCodexApiHandler } from './codex-api.mjs';

const servers = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve)))));

async function start(adapter, options = {}) {
  const server = createServer(createCodexApiHandler(adapter, options));
  servers.push(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

const validRequest = { episode: { title: '첫 근무' }, characters: [], relationships: [] };
const validAppearanceRequest = {
  character: { id: 'c1', name: '밤톨', type: '강아지', personality: '느긋함', habits: '', likes: '산책', dislikes: '목욕' },
};
const validHiggsfieldRequest = {
  episode: { id: 'e1', title: '첫 출근' },
  scene: { id: 's1', title: '첫 업무', action: '서류를 흩뜨린다', dialogue: '네!', camera: '줌인', mood: '코미디', negativePrompt: '왜곡 금지' },
  characters: [], relationships: [],
};
const validHiggsfieldPrompt = '0~2초에는 줄리아가 두 발로 선다. 2~6초에는 직원의 지시를 듣고 서류를 든다. 6~8초에는 종이를 든 자세로 멈춘다. 동일한 첫 기준 @audio로 목소리를 유지한다.';
const validReferenceAssetRequest = {
  episode: { id: 'e1', title: '첫 면접' },
  scene: { id: 's1', title: '온라인 면접', action: '노트북의 입장 버튼을 누른다' },
  characters: [{ id: 'c1', name: '줄리아', hasReferenceImage: true }],
};
const validReferenceAssets = [
  { keyword: '면접 부스', category: 'environment', reason: '공간 기준', imagePrompt: '현실적인 면접 부스, 인물과 글자 없음', priority: 'required' },
  { keyword: '노트북', category: 'prop', reason: '핵심 소품', imagePrompt: '은색 노트북, 로고 없음', priority: 'required' },
  { keyword: '입장 화면', category: 'screen', reason: '입장 행동 기준', imagePrompt: '화상 면접 대기 화면 UI, 글자 없음', priority: 'optional' },
];
const completeDraft = {
  logline: '로그라인', theme: '주제', outerGoal: '목표', innerNeed: '필요', flaw: '약점', obstacle: '장애물', stakes: '대가', twist: '반전', ending: '결말', nextHook: '다음 훅',
  beats: ['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next'].map((kind) => ({ kind, content: `${kind} 내용`, continuityOut: `${kind} 마지막 자세` })), editorNotes: ['검수 완료'],
};
const seriesBeatKinds = ['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next'];
const validSeriesRequest = {
  series: { premise: '오늘 면접 준비를 시작한 줄리아', protagonistId: 'c1', comedyModes: ['relatable', 'meme'] },
  characters: [{ id: 'c1', name: '줄리아', type: 'animal' }], relationships: [], history: [], trends: [],
};
const makeSeriesProposal = (id, title, category, comedyMode) => ({
  id, title, category, comedyMode, idea: `${title} 아이디어`, logline: '로그라인', theme: '주제',
  outerGoal: '외적 목표', innerNeed: '내적 필요', flaw: '약점', obstacle: '장애물', stakes: '대가',
  twist: '반전', ending: '결말', nextHook: '다음 훅', whyNow: '지금 이어질 이유',
  stateChanges: ['상태 변화'], openThreads: ['열린 실마리'], resolvedThreads: [], characterIds: ['c1'], trendIds: [],
  fun: { setup: '설정', escalation: '상승', reversal: '반전', visualGag: '시각 개그', payoff: '보상', funReason: '재미 이유' },
  beats: seriesBeatKinds.map((kind) => ({ kind, content: `${kind} 행동`, continuityOut: `${kind} 마지막 자세` })),
});
const validSeriesProposals = [
  makeSeriesProposal('s1', '첫 출근', '직장', 'relatable'),
  makeSeriesProposal('s2', '첫 회식', '회식', 'meme'),
  makeSeriesProposal('s3', '첫 주말', '주말', 'relatable'),
];
const getToken = async (base) => (await (await fetch(`${base}/api/codex/status`)).json()).requestToken;

describe('Codex localhost API', () => {
  it('원클릭 실행기가 사용할 ASCII 건강 상태를 반환한다', async () => {
    const base = await start({ getStatus: async () => ({}), generateStoryDraft: async () => ({}) });
    const response = await fetch(`${base}/api/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ app: 'writer-prompt-studio' });
  });

  it('연결 상태를 반환한다', async () => {
    const base = await start({ getStatus: async () => ({ available: true, authenticated: false, message: '로그인 필요' }), generateStoryDraft: async () => ({}) });
    const response = await fetch(`${base}/api/codex/status`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ available: true, authenticated: false, message: '로그인 필요', requestToken: expect.any(String) }));
  });

  it('잘못된 초안 요청을 거부하고 정상 요청은 정리된 결과를 반환한다', async () => {
    const base = await start({
      getStatus: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
      generateStoryDraft: async () => ({ threadId: 'thread-1', draft: { ...completeDraft, unsafe: true } }),
    });
    const token = await getToken(base);
    const headers = { 'content-type': 'application/json', 'x-codex-request-token': token };
    const bad = await fetch(`${base}/api/codex/story-draft`, { method: 'POST', headers, body: JSON.stringify({ characters: [] }) });
    expect(bad.status).toBe(400);
    const good = await fetch(`${base}/api/codex/story-draft`, { method: 'POST', headers, body: JSON.stringify(validRequest) });
    expect(good.status).toBe(200);
    expect(await good.json()).toEqual({ threadId: 'thread-1', draft: completeDraft, editorNotes: ['검수 완료'] });
  });

  it('1MB를 넘는 요청을 거부한다', async () => {
    const base = await start({ getStatus: async () => ({}), generateStoryDraft: async () => ({}) });
    const token = await getToken(base);
    const response = await fetch(`${base}/api/codex/story-draft`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-codex-request-token': token }, body: JSON.stringify({ ...validRequest, padding: 'x'.repeat(1024 * 1024) }) });
    expect(response.status).toBe(413);
  });

  it('토큰·JSON 콘텐츠 유형·동일 출처 조건을 강제한다', async () => {
    const base = await start({ getStatus: async () => ({}), generateStoryDraft: async () => ({ threadId: 'x', draft: completeDraft }) });
    const token = await getToken(base);
    const noToken = await fetch(`${base}/api/codex/story-draft`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validRequest) });
    expect(noToken.status).toBe(401);
    const plain = await fetch(`${base}/api/codex/story-draft`, { method: 'POST', headers: { 'content-type': 'text/plain', 'x-codex-request-token': token }, body: JSON.stringify(validRequest) });
    expect(plain.status).toBe(415);
    const jsonp = await fetch(`${base}/api/codex/story-draft`, { method: 'POST', headers: { 'content-type': 'application/jsonp', 'x-codex-request-token': token }, body: JSON.stringify(validRequest) });
    expect(jsonp.status).toBe(415);
    const crossSite = await fetch(`${base}/api/codex/story-draft`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-codex-request-token': token, origin: 'https://attacker.example' }, body: JSON.stringify(validRequest) });
    expect(crossSite.status).toBe(403);
  });

  it('Codex 생성 중에는 두 번째 실행을 409로 막는다', async () => {
    let release;
    let startedResolve;
    let calls = 0;
    const gate = new Promise((resolve) => { release = resolve; });
    const started = new Promise((resolve) => { startedResolve = resolve; });
    const base = await start({ getStatus: async () => ({}), generateStoryDraft: async () => { calls += 1; startedResolve(); await gate; return { threadId: 'x', draft: completeDraft }; } });
    const token = await getToken(base);
    const headers = { 'content-type': 'application/json', 'x-codex-request-token': token };
    const first = fetch(`${base}/api/codex/story-draft`, { method: 'POST', headers, body: JSON.stringify(validRequest) });
    await started;
    const second = await fetch(`${base}/api/codex/story-draft`, { method: 'POST', headers, body: JSON.stringify(validRequest) });
    expect(second.status).toBe(409);
    release();
    expect((await first).status).toBe(200);
    expect(calls).toBe(1);
  });

  it('본문 전송이 끝나지 않은 요청은 생성 잠금을 점유하지 않는다', async () => {
    let calls = 0;
    const base = await start({
      getStatus: async () => ({}),
      generateStoryDraft: async () => { calls += 1; return { threadId: 'x', draft: completeDraft }; },
    });
    const token = await getToken(base);
    const slow = httpRequest(`${base}/api/codex/story-draft`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-codex-request-token': token, 'content-length': '1000' },
    });
    slow.on('error', () => {});
    await new Promise((resolve) => slow.once('socket', (socket) => socket.connecting ? socket.once('connect', resolve) : resolve()));
    slow.write('{"episode":');
    await new Promise((resolve) => setTimeout(resolve, 20));

    try {
      const response = await fetch(`${base}/api/codex/story-draft`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-codex-request-token': token },
        body: JSON.stringify(validRequest),
      });

      expect(response.status).toBe(200);
      expect(calls).toBe(1);
    } finally {
      slow.destroy();
    }
  });

  it('클라이언트가 연결을 끊으면 진행 중인 Codex 실행을 취소한다', async () => {
    let startedResolve;
    let firstSignal;
    let calls = 0;
    const started = new Promise((resolve) => { startedResolve = resolve; });
    const base = await start({
      getStatus: async () => ({}),
      generateStoryDraft: async (_input, options = {}) => {
        calls += 1;
        if (calls === 1) {
          firstSignal = options.signal;
          startedResolve();
          if (firstSignal) await new Promise((_, reject) => firstSignal.addEventListener('abort', () => reject(Object.assign(new Error('요청 취소'), { statusCode: 499 })), { once: true }));
        }
        return { threadId: 'x', draft: completeDraft };
      },
    });
    const token = await getToken(base);
    const body = JSON.stringify(validRequest);
    const first = httpRequest(`${base}/api/codex/story-draft`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-codex-request-token': token, 'content-length': Buffer.byteLength(body) },
    });
    first.on('error', () => {});
    first.end(body);
    await started;
    first.destroy();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const second = await fetch(`${base}/api/codex/story-draft`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-codex-request-token': token },
      body,
    });

    expect(firstSignal?.aborted).toBe(true);
    expect(second.status).toBe(200);
    expect(calls).toBe(2);
  });

  it('외형 제안 요청을 검증하고 appearance 한 필드만 반환한다', async () => {
    const base = await start({
      getStatus: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
      generateAppearanceSuggestion: async () => ({ threadId: 'appearance-1', appearance: '크림색 곱슬 털과 둥근 눈', unsafe: true }),
    });
    const token = await getToken(base);
    const headers = { 'content-type': 'application/json', 'x-codex-request-token': token };

    const bad = await fetch(`${base}/api/codex/appearance-suggestion`, {
      method: 'POST', headers, body: JSON.stringify({ character: 'broken' }),
    });
    expect(bad.status).toBe(400);

    const good = await fetch(`${base}/api/codex/appearance-suggestion`, {
      method: 'POST', headers, body: JSON.stringify(validAppearanceRequest),
    });
    expect(good.status).toBe(200);
    expect(await good.json()).toEqual({ appearance: '크림색 곱슬 털과 둥근 눈' });
  });

  it('외형 제안은 3MB를 넘는 요청 본문을 거부한다', async () => {
    const base = await start({ getStatus: async () => ({}), generateAppearanceSuggestion: async () => ({}) });
    const token = await getToken(base);
    const response = await fetch(`${base}/api/codex/appearance-suggestion`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-codex-request-token': token },
      body: JSON.stringify({ ...validAppearanceRequest, padding: 'x'.repeat(3 * 1024 * 1024) }),
    });

    expect(response.status).toBe(413);
  });

  it('이야기 작성과 외형 제안은 하나의 Codex 실행 잠금을 공유한다', async () => {
    let release;
    let startedResolve;
    const gate = new Promise((resolve) => { release = resolve; });
    const started = new Promise((resolve) => { startedResolve = resolve; });
    const base = await start({
      getStatus: async () => ({}),
      generateAppearanceSuggestion: async () => {
        startedResolve();
        await gate;
        return { appearance: '둥근 눈' };
      },
      generateStoryDraft: async () => ({ threadId: 'story', draft: completeDraft }),
    });
    const token = await getToken(base);
    const headers = { 'content-type': 'application/json', 'x-codex-request-token': token };
    const first = fetch(`${base}/api/codex/appearance-suggestion`, {
      method: 'POST', headers, body: JSON.stringify(validAppearanceRequest),
    });
    await started;

    const second = await fetch(`${base}/api/codex/story-draft`, {
      method: 'POST', headers, body: JSON.stringify(validRequest),
    });
    expect(second.status).toBe(409);

    release();
    expect((await first).status).toBe(200);
  });

  it('힉스필드 프롬프트 요청을 검증하고 prompt 한 필드만 반환한다', async () => {
    const base = await start({
      getStatus: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
      generateHiggsfieldPrompt: async () => ({ threadId: 'hf-1', prompt: validHiggsfieldPrompt, unsafe: true }),
    });
    const token = await getToken(base);
    const headers = { 'content-type': 'application/json', 'x-codex-request-token': token };

    const bad = await fetch(`${base}/api/codex/higgsfield-prompt`, { method: 'POST', headers, body: JSON.stringify({ scene: 'broken' }) });
    expect(bad.status).toBe(400);

    const good = await fetch(`${base}/api/codex/higgsfield-prompt`, { method: 'POST', headers, body: JSON.stringify(validHiggsfieldRequest) });
    expect(good.status).toBe(200);
    expect(await good.json()).toEqual({ prompt: validHiggsfieldPrompt });
  });

  it('힉스필드 프롬프트 내부 오류의 실제 원인을 서버 기록에 남긴다', async () => {
    const cause = new Error('힉스필드 프롬프트는 4~8문장이어야 합니다.');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const base = await start({
      getStatus: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
      generateHiggsfieldPrompt: async () => { throw cause; },
    });
    const token = await getToken(base);

    const response = await fetch(`${base}/api/codex/higgsfield-prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-codex-request-token': token },
      body: JSON.stringify(validHiggsfieldRequest),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: 'Codex 힉스필드 프롬프트 생성에 실패했습니다.' });
    expect(errorSpy).toHaveBeenCalledWith('[Codex 힉스필드 프롬프트 생성 실패]', cause);
    errorSpy.mockRestore();
  });

  it('장면 필요 이미지 요청을 검증하고 3~6개 제안만 반환한다', async () => {
    const base = await start({
      getStatus: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
      generateReferenceAssetSuggestions: async () => ({ threadId: 'asset-1', assets: validReferenceAssets, unsafe: true }),
    });
    const token = await getToken(base);
    const headers = { 'content-type': 'application/json', 'x-codex-request-token': token };

    const bad = await fetch(`${base}/api/codex/reference-assets`, { method: 'POST', headers, body: JSON.stringify({ scene: 'broken' }) });
    expect(bad.status).toBe(400);
    const good = await fetch(`${base}/api/codex/reference-assets`, { method: 'POST', headers, body: JSON.stringify(validReferenceAssetRequest) });
    expect(good.status).toBe(200);
    expect(await good.json()).toEqual({ assets: validReferenceAssets });
  });

  it('장면 이미지 생성 요청을 검증하고 생성된 PNG만 반환한다', async () => {
    let received;
    const imageGenerator = { generate: async (input) => {
      received = input;
      return { imageDataUrl: 'data:image/png;base64,QUJDRA==', mimeType: 'image/png', model: 'gpt-image-2' };
    } };
    const base = await start({ getStatus: async () => ({}) }, { imageGenerator });
    const token = await getToken(base);
    const headers = { 'content-type': 'application/json', 'x-codex-request-token': token };

    const bad = await fetch(`${base}/api/images/generate`, { method: 'POST', headers, body: JSON.stringify({ imagePrompt: '' }) });
    expect(bad.status).toBe(400);
    const good = await fetch(`${base}/api/images/generate`, { method: 'POST', headers, body: JSON.stringify({
      assetId: 'a1', keyword: '노트북', category: 'prop', imagePrompt: '은색 노트북, 로고 없음', sceneTitle: '온라인 면접',
    }) });

    expect(good.status).toBe(200);
    expect(received).toEqual({ prompt: '은색 노트북, 로고 없음', size: '1024x1024' });
    expect(await good.json()).toEqual({ imageDataUrl: 'data:image/png;base64,QUJDRA==', mimeType: 'image/png', model: 'gpt-image-2' });
  });

  it('연재 제안 요청을 검증하고 승인 전 후보 3개만 반환한다', async () => {
    const base = await start({
      getStatus: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
      generateSeriesProposals: async () => ({ threadId: 'series-1', proposals: validSeriesProposals, unsafe: true }),
    });
    const token = await getToken(base);
    const headers = { 'content-type': 'application/json', 'x-codex-request-token': token };

    const bad = await fetch(`${base}/api/codex/series-proposals`, { method: 'POST', headers, body: JSON.stringify({ series: {} }) });
    expect(bad.status).toBe(400);

    const good = await fetch(`${base}/api/codex/series-proposals`, { method: 'POST', headers, body: JSON.stringify(validSeriesRequest) });
    expect(good.status).toBe(200);
    expect(await good.json()).toEqual({ proposals: validSeriesProposals });
  });
});
