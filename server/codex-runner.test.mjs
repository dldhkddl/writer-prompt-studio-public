import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as codexRunnerModule from './codex-runner.mjs';

const { createCodexRunner, createThreadOptions, getBundledCodexCommand } = codexRunnerModule;

const beatKinds = ['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next'];
const seriesRequest = {
  series: { premise: '오늘 면접 준비를 시작한 줄리아', protagonistId: 'c1', comedyModes: ['relatable', 'meme'] },
  characters: [{ id: 'c1', name: '줄리아', type: 'animal', personality: '성실하지만 눈치가 조금 없다', hasReferenceImage: true }],
  relationships: [], history: [], trends: [],
};
const makeCandidate = (index, comedyMode) => ({
  id: `candidate-${index}`, title: `후보 ${index}`, category: `생활 ${index}`, comedyMode,
  concept: `상황 ${index}`, conflict: `갈등 ${index}`, reversal: `반전 ${index}`,
  visualGag: `시각 개그 ${index}`, payoff: `보상 ${index}`, funReason: `재미 이유 ${index}`,
  characterIds: ['c1'], trendIds: [],
});
const seriesCandidates = {
  candidates: Array.from({ length: 6 }, (_, index) => makeCandidate(index + 1, index < 3 ? 'relatable' : 'meme')),
};
const makeProposal = (candidate) => ({
  id: candidate.id, title: candidate.title, category: candidate.category, comedyMode: candidate.comedyMode,
  idea: candidate.concept, logline: '로그라인', theme: '주제', outerGoal: '외적 목표', innerNeed: '내적 필요',
  flaw: '약점', obstacle: '장애물', stakes: '대가', twist: candidate.reversal, ending: candidate.payoff,
  nextHook: '다음 화 훅', whyNow: '지금 이어져야 하는 이유', stateChanges: ['회사원이 된다'],
  openThreads: ['첫 출근'], resolvedThreads: ['면접 준비'], characterIds: ['c1'], trendIds: [],
  fun: { setup: '설정', escalation: '상승', reversal: candidate.reversal, visualGag: candidate.visualGag, payoff: candidate.payoff, funReason: candidate.funReason },
  beats: beatKinds.map((kind) => ({ kind, content: `${kind} 행동`, continuityOut: `${kind} 마지막 자세` })),
});
const seriesProposals = {
  proposals: [
    makeProposal(seriesCandidates.candidates[0]),
    makeProposal(seriesCandidates.candidates[3]),
    makeProposal(seriesCandidates.candidates[5]),
  ],
};

describe('Codex SDK 실행기', () => {
  it('데스크톱 Codex 로그인 폴더를 자식 실행기에 명시적으로 전달한다', () => {
    expect(codexRunnerModule.createCodexProcessEnvironment).toBeTypeOf('function');

    const environment = codexRunnerModule.createCodexProcessEnvironment(
      { USERPROFILE: 'C:\\Users\\writer', PATH: 'C:\\Windows' },
    );

    expect(environment).toMatchObject({
      USERPROFILE: 'C:\\Users\\writer',
      PATH: 'C:\\Windows',
      CODEX_HOME: 'C:\\Users\\writer\\.codex',
    });
  });

  it('상태 확인도 SDK에 포함된 Codex 실행 파일을 사용한다', () => {
    const command = getBundledCodexCommand();

    expect(command.file).toBe(process.execPath);
    expect(command.args.at(-1)?.replaceAll('\\', '/')).toContain('@openai/codex/bin/codex.js');
    expect(existsSync(command.args.at(-1))).toBe(true);
  });

  it('앱에서 시작하는 작업은 전역 설정과 무관하게 Sol medium으로 실행한다', () => {
    const options = createThreadOptions('C:/writer-studio');

    expect(options).toMatchObject({
      workingDirectory: 'C:/writer-studio',
      model: 'gpt-5.6-sol',
      modelReasoningEffort: 'medium',
      sandboxMode: 'read-only',
      approvalPolicy: 'never',
      networkAccessEnabled: false,
    });
  });

  it('사진 없이 캐릭터 설정을 보내고 구조화된 외형 제안을 반환한다', async () => {
    const calls = {};
    const codexInstance = {
      startThread(options) {
        calls.threadOptions = options;
        return {
          id: 'appearance-thread',
          async run(input, options) {
            calls.input = input;
            calls.runOptions = options;
            return { finalResponse: JSON.stringify({ appearance: '크림색 곱슬 털과 둥근 갈색 눈' }) };
          },
        };
      },
    };
    const runner = createCodexRunner({
      projectRoot: 'C:/writer-studio',
      codexInstance,
      statusProvider: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
    });

    const result = await runner.generateAppearanceSuggestion({
      character: { id: 'c1', name: '밤톨', type: '강아지', personality: '느긋함' },
    });

    expect(result).toEqual({ threadId: 'appearance-thread', appearance: '크림색 곱슬 털과 둥근 갈색 눈' });
    expect(calls.threadOptions.model).toBe('gpt-5.6-sol');
    expect(calls.input).toContain('사진이 제공되지 않았다');
    expect(calls.runOptions.outputSchema.required).toEqual(['appearance']);
  });

  it('Sol 작가 후보 6개를 만든 뒤 재미 편집자가 최종 3개로 완성한다', async () => {
    const calls = [];
    const codexInstance = {
      startThread(options) {
        expect(options.model).toBe('gpt-5.6-sol');
        return {
          id: 'series-thread',
          async run(input, options) {
            calls.push({ input, options });
            return { finalResponse: JSON.stringify(calls.length === 1 ? seriesCandidates : seriesProposals) };
          },
        };
      },
    };
    const runner = createCodexRunner({
      projectRoot: 'C:/writer-studio', codexInstance,
      statusProvider: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
    });

    await expect(runner.generateSeriesProposals(seriesRequest)).resolves.toEqual({
      threadId: 'series-thread', proposals: seriesProposals.proposals,
    });
    expect(calls).toHaveLength(2);
    expect(calls[0].input).toContain('요약 후보를 정확히 6개');
    expect(calls[0].options.outputSchema.required).toEqual(['candidates']);
    expect(calls[1].input).toContain('재미 편집자');
    expect(calls[1].options.outputSchema.required).toEqual(['proposals']);
  });

  it('연재의 후보 생성과 최종 편집에 각각 독립된 응답 시간을 준다', async () => {
    let runCount = 0;
    const wait = (signal) => new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 25);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(Object.assign(new Error('취소'), { name: 'AbortError' }));
      }, { once: true });
    });
    const codexInstance = {
      startThread() {
        return {
          id: 'series-timeout-thread',
          async run(_input, options) {
            await wait(options.signal);
            runCount += 1;
            return { finalResponse: JSON.stringify(runCount === 1 ? seriesCandidates : seriesProposals) };
          },
        };
      },
    };
    const runner = createCodexRunner({
      projectRoot: 'C:/writer-studio', codexInstance, timeoutMs: 10, seriesTimeoutMs: 40,
      statusProvider: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
    });

    await expect(runner.generateSeriesProposals(seriesRequest)).resolves.toEqual({
      threadId: 'series-timeout-thread', proposals: seriesProposals.proposals,
    });
  });

  it('Sol로 힉스필드 실행 프롬프트를 생성하고 구조화된 결과를 반환한다', async () => {
    const calls = {};
    const codexInstance = {
      startThread(options) {
        calls.threadOptions = options;
        return {
          id: 'higgsfield-thread',
          async run(input, options) {
            calls.input = input;
            calls.runOptions = options;
            return { finalResponse: JSON.stringify({ prompt: '0~2초에는 검은색 시바견 줄리아가 두 발로 선다. 2~6초에는 직원의 지시를 듣고 서류를 든다. 6~8초에는 종이를 든 자세로 멈춘다. 동일한 첫 기준 @audio로 목소리를 유지한다.' }) };
          },
        };
      },
    };
    const runner = createCodexRunner({
      projectRoot: 'C:/writer-studio', codexInstance,
      statusProvider: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
    });
    const request = {
      episode: { id: 'e1', title: '첫 출근' },
      scene: { id: 's1', title: '첫 업무', action: '서류를 흩뜨린다', dialogue: '네!', camera: '줌인', mood: '코미디', negativePrompt: '왜곡 금지' },
      characters: [], relationships: [],
    };

    await expect(runner.generateHiggsfieldPrompt(request)).resolves.toEqual({
      threadId: 'higgsfield-thread', prompt: '0~2초에는 검은색 시바견 줄리아가 두 발로 선다. 2~6초에는 직원의 지시를 듣고 서류를 든다. 6~8초에는 종이를 든 자세로 멈춘다. 동일한 첫 기준 @audio로 목소리를 유지한다.',
    });
    expect(calls.threadOptions.model).toBe('gpt-5.6-sol');
    expect(calls.input).toContain('Higgsfield 프롬프트 연출가');
    expect(calls.runOptions.outputSchema.required).toEqual(['prompt']);
  });

  it('Sol 힉스필드 감독이 장면에 필요한 이미지 항목을 구조화해 반환한다', async () => {
    const assets = [
      { keyword: '면접 부스', category: 'environment', reason: '공간 기준', imagePrompt: '현실적인 한국 면접 부스, 인물과 글자 없음', priority: 'required' },
      { keyword: '노트북', category: 'prop', reason: '핵심 조작 소품', imagePrompt: '은색 노트북 제품 기준 이미지, 로고 없음', priority: 'required' },
      { keyword: '입장 화면', category: 'screen', reason: '입장 행동 기준', imagePrompt: '화상 면접 대기 화면 UI, 글자 없음', priority: 'optional' },
    ];
    const calls = {};
    const codexInstance = {
      startThread() {
        return {
          id: 'asset-thread',
          async run(input, options) {
            calls.input = input;
            calls.options = options;
            return { finalResponse: JSON.stringify({ assets }) };
          },
        };
      },
    };
    const runner = createCodexRunner({
      projectRoot: 'C:/writer-studio', codexInstance,
      statusProvider: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
    });

    await expect(runner.generateReferenceAssetSuggestions({
      episode: { id: 'e1', title: '첫 면접' },
      scene: { id: 's1', title: '온라인 면접', action: '노트북의 입장 버튼을 누른다' },
      characters: [{ id: 'c1', name: '줄리아', hasReferenceImage: true }],
    })).resolves.toEqual({ threadId: 'asset-thread', assets });
    expect(calls.input).toContain('3개 이상 6개 이하');
    expect(calls.options.outputSchema.required).toEqual(['assets']);
  });

  it('장면 필요 이미지 제안에는 일반 작업과 별도의 긴 응답 시간을 적용한다', async () => {
    const assets = [
      { keyword: '면접 부스', category: 'environment', reason: '공간 기준', imagePrompt: '현실적인 면접 부스', priority: 'required' },
      { keyword: '노트북', category: 'prop', reason: '핵심 소품', imagePrompt: '은색 노트북', priority: 'required' },
      { keyword: '입장 화면', category: 'screen', reason: '화면 기준', imagePrompt: '면접 입장 화면', priority: 'optional' },
    ];
    const codexInstance = {
      startThread() {
        return {
          id: 'slow-asset-thread',
          async run(_input, { signal }) {
            await new Promise((resolve, reject) => {
              const timer = setTimeout(resolve, 25);
              signal.addEventListener('abort', () => { clearTimeout(timer); reject(Object.assign(new Error('aborted'), { name: 'AbortError' })); }, { once: true });
            });
            return { finalResponse: JSON.stringify({ assets }) };
          },
        };
      },
    };
    const runner = createCodexRunner({
      projectRoot: 'C:/writer-studio', codexInstance, timeoutMs: 10, referenceAssetTimeoutMs: 40,
      statusProvider: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
    });

    await expect(runner.generateReferenceAssetSuggestions({
      episode: { id: 'e1', title: '첫 면접' },
      scene: { id: 's1', title: '온라인 면접', action: '노트북의 입장 버튼을 누른다' },
      characters: [{ id: 'c1', name: '줄리아', hasReferenceImage: true }],
    })).resolves.toEqual({ threadId: 'slow-asset-thread', assets });
  });

  it('사진을 local_image로 전달하고 응답 후 임시 파일을 삭제한다', async () => {
    let temporaryImagePath = '';
    const codexInstance = {
      startThread() {
        return {
          id: 'photo-thread',
          async run(input) {
            expect(input[0].type).toBe('text');
            expect(input[1].type).toBe('local_image');
            temporaryImagePath = input[1].path;
            expect(existsSync(temporaryImagePath)).toBe(true);
            return { finalResponse: JSON.stringify({ appearance: '검은 귀와 흰 이마 무늬' }) };
          },
        };
      },
    };
    const runner = createCodexRunner({
      projectRoot: 'C:/writer-studio',
      codexInstance,
      statusProvider: async () => ({ available: true, authenticated: true, message: 'Codex 연결됨' }),
    });

    await expect(runner.generateAppearanceSuggestion({
      character: { id: 'c1', name: '밤톨', type: '강아지' },
      imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    })).resolves.toEqual({ threadId: 'photo-thread', appearance: '검은 귀와 흰 이마 무늬' });

    expect(temporaryImagePath).not.toBe('');
    expect(existsSync(temporaryImagePath)).toBe(false);
  });

  it('상태 확인 중 취소되면 Codex 스레드를 시작하지 않고 즉시 취소한다', async () => {
    let statusStartedResolve;
    const statusStarted = new Promise((resolve) => { statusStartedResolve = resolve; });
    let startThreadCalls = 0;
    const codexInstance = {
      startThread() {
        startThreadCalls += 1;
        return {
          id: 'should-not-start',
          async run(_input, options) {
            if (options.signal.aborted) throw Object.assign(new Error('취소'), { name: 'AbortError' });
            return { finalResponse: JSON.stringify({ appearance: '외형' }) };
          },
        };
      },
    };
    const statusProvider = async (signal) => {
      statusStartedResolve();
      if (!signal) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { available: true, authenticated: true, message: 'Codex 연결됨' };
      }
      await new Promise((_, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('취소'), { name: 'AbortError' })), { once: true }));
    };
    const runner = createCodexRunner({ projectRoot: 'C:/writer-studio', codexInstance, statusProvider });
    const controller = new AbortController();
    const generation = runner.generateAppearanceSuggestion({ character: { id: 'c1', type: 'animal' } }, { signal: controller.signal });
    await statusStarted;

    controller.abort();

    await expect(generation).rejects.toMatchObject({ statusCode: 499 });
    expect(startThreadCalls).toBe(0);
  });
});
