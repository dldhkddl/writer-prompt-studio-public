import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Codex } from '@openai/codex-sdk';
import {
  appearanceSuggestionSchema,
  buildAppearancePrompt,
  buildHiggsfieldPrompt,
  buildReferenceAssetPrompt,
  buildSeriesCandidatePrompt,
  buildSeriesEditorPrompt,
  buildStoryPrompt,
  createStoryVariationPicker,
  higgsfieldPromptSchema,
  referenceAssetSuggestionSchema,
  sanitizeAppearanceSuggestion,
  sanitizeHiggsfieldPrompt,
  sanitizeReferenceAssetSuggestions,
  sanitizeSeriesCandidates,
  sanitizeSeriesProposals,
  seriesCandidateSchema,
  seriesProposalSchema,
  storyDraftSchema,
} from './codex-contract.mjs';
import { withTemporaryAppearanceImage } from './appearance-image.mjs';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

export function getBundledCodexCommand() {
  return { file: process.execPath, args: [require.resolve('@openai/codex/bin/codex.js')] };
}

export function createCodexProcessEnvironment(environment = process.env) {
  const inherited = Object.fromEntries(
    Object.entries(environment).filter((entry) => typeof entry[1] === 'string'),
  );
  const configuredHome = String(environment.CODEX_HOME ?? '').trim();
  const userProfile = String(environment.USERPROFILE ?? '').trim();
  return {
    ...inherited,
    CODEX_HOME: configuredHome || join(userProfile || homedir(), '.codex'),
  };
}

export function createThreadOptions(projectRoot) {
  return {
    workingDirectory: projectRoot,
    skipGitRepoCheck: true,
    sandboxMode: 'read-only',
    approvalPolicy: 'never',
    networkAccessEnabled: false,
    webSearchMode: 'disabled',
    model: 'gpt-5.6-sol',
    modelReasoningEffort: 'medium',
    threadSource: 'writer-prompt-studio',
  };
}

export function createCodexRunner({ projectRoot, timeoutMs = 120_000, referenceAssetTimeoutMs = 300_000, seriesTimeoutMs = 300_000, codexInstance, statusProvider } = {}) {
  const codexEnvironment = createCodexProcessEnvironment();
  const codex = codexInstance ?? new Codex({ env: codexEnvironment });
  const nextStoryVariation = createStoryVariationPicker();
  const getStatus = async (signal) => {
    if (statusProvider) return statusProvider(signal);
    try {
      const command = getBundledCodexCommand();
      const { stdout, stderr } = await execFileAsync(command.file, [...command.args, 'login', 'status'], { timeout: 10_000, windowsHide: true, signal, env: codexEnvironment });
      const output = `${stdout}\n${stderr}`;
      const authenticated = /logged in/i.test(output) && !/not logged in/i.test(output);
      return { available: true, authenticated, message: authenticated ? 'Codex 연결됨' : 'Codex 로그인이 필요합니다.' };
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      const output = `${error?.stdout ?? ''}\n${error?.stderr ?? ''}`;
      if (/not logged in/i.test(output)) return { available: true, authenticated: false, message: 'Codex 로그인이 필요합니다.' };
      return { available: false, authenticated: false, message: 'Codex 실행 파일을 찾을 수 없습니다.' };
    }
  };
  const requireReadyStatus = async (signal) => {
    try {
      const status = await getStatus(signal);
      if (signal?.aborted) throw Object.assign(new Error('취소'), { name: 'AbortError' });
      if (!status.available) throw Object.assign(new Error(status.message), { statusCode: 503 });
      if (!status.authenticated) throw Object.assign(new Error(status.message), { statusCode: 401 });
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError') {
        throw Object.assign(new Error('Codex 요청이 취소되었습니다.'), { statusCode: 499 });
      }
      throw error;
    }
  };
  return {
    getStatus,

    async generateStoryDraft(request, { signal } = {}) {
      await requireReadyStatus(signal);
      const thread = codex.startThread(createThreadOptions(projectRoot));
      const controller = new AbortController();
      let timedOut = false;
      const abort = () => controller.abort();
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      try {
        const result = await thread.run(buildStoryPrompt(request, { variation: nextStoryVariation() }), { outputSchema: storyDraftSchema, signal: controller.signal });
        return { threadId: thread.id ?? '', draft: JSON.parse(result.finalResponse) };
      } catch (error) {
        if (timedOut) throw Object.assign(new Error('Codex 응답 시간이 초과되었습니다.'), { statusCode: 504 });
        if (controller.signal.aborted) throw Object.assign(new Error('Codex 요청이 취소되었습니다.'), { statusCode: 499 });
        throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      }
    },

    async generateHiggsfieldPrompt(request, { signal } = {}) {
      await requireReadyStatus(signal);
      const thread = codex.startThread(createThreadOptions(projectRoot));
      const controller = new AbortController();
      let timedOut = false;
      const abort = () => controller.abort();
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      try {
        const result = await thread.run(buildHiggsfieldPrompt(request), { outputSchema: higgsfieldPromptSchema, signal: controller.signal });
        return { threadId: thread.id ?? '', ...sanitizeHiggsfieldPrompt(JSON.parse(result.finalResponse), request) };
      } catch (error) {
        if (timedOut) throw Object.assign(new Error('Codex 응답 시간이 초과되었습니다.'), { statusCode: 504 });
        if (controller.signal.aborted) throw Object.assign(new Error('Codex 요청이 취소되었습니다.'), { statusCode: 499 });
        throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      }
    },

    async generateReferenceAssetSuggestions(request, { signal } = {}) {
      await requireReadyStatus(signal);
      const thread = codex.startThread(createThreadOptions(projectRoot));
      const controller = new AbortController();
      let timedOut = false;
      const abort = () => controller.abort();
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, referenceAssetTimeoutMs);
      try {
        const result = await thread.run(buildReferenceAssetPrompt(request), { outputSchema: referenceAssetSuggestionSchema, signal: controller.signal });
        return { threadId: thread.id ?? '', ...sanitizeReferenceAssetSuggestions(JSON.parse(result.finalResponse)) };
      } catch (error) {
        if (timedOut) throw Object.assign(new Error('Codex 응답 시간이 초과되었습니다.'), { statusCode: 504 });
        if (controller.signal.aborted) throw Object.assign(new Error('Codex 요청이 취소되었습니다.'), { statusCode: 499 });
        throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      }
    },

    async generateSeriesProposals(request, { signal } = {}) {
      await requireReadyStatus(signal);
      const thread = codex.startThread(createThreadOptions(projectRoot));
      let stage = '후보 6개 생성';
      const controller = new AbortController();
      let timedOut = false;
      const abort = () => controller.abort();
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
      let timer;
      const armTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(() => { timedOut = true; controller.abort(); }, seriesTimeoutMs);
      };
      armTimer();
      try {
        const candidateResult = await thread.run(buildSeriesCandidatePrompt(request), {
          outputSchema: seriesCandidateSchema,
          signal: controller.signal,
        });
        const candidates = sanitizeSeriesCandidates(JSON.parse(candidateResult.finalResponse), request);
        stage = '최종 3개 편집';
        armTimer();
        const proposalResult = await thread.run(buildSeriesEditorPrompt(request, candidates), {
          outputSchema: seriesProposalSchema,
          signal: controller.signal,
        });
        return {
          threadId: thread.id ?? '',
          ...sanitizeSeriesProposals(JSON.parse(proposalResult.finalResponse), request, candidates),
        };
      } catch (error) {
        if (!timedOut && !controller.signal.aborted) console.error(`[연재 자동 작가: ${stage}]`, error);
        if (timedOut) throw Object.assign(new Error('Codex 응답 시간이 초과되었습니다.'), { statusCode: 504 });
        if (controller.signal.aborted) throw Object.assign(new Error('Codex 요청이 취소되었습니다.'), { statusCode: 499 });
        throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      }
    },

    async generateAppearanceSuggestion(request, { signal } = {}) {
      await requireReadyStatus(signal);
      const prompt = buildAppearancePrompt(request);
      const run = async (imagePath) => {
        const thread = codex.startThread(createThreadOptions(projectRoot));
        const input = imagePath
          ? [{ type: 'text', text: prompt }, { type: 'local_image', path: imagePath }]
          : prompt;
        const controller = new AbortController();
        let timedOut = false;
        const abort = () => controller.abort();
        if (signal?.aborted) abort();
        else signal?.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
        try {
          const result = await thread.run(input, { outputSchema: appearanceSuggestionSchema, signal: controller.signal });
          return { threadId: thread.id ?? '', ...sanitizeAppearanceSuggestion(JSON.parse(result.finalResponse)) };
        } catch (error) {
          if (timedOut) throw Object.assign(new Error('Codex 응답 시간이 초과되었습니다.'), { statusCode: 504 });
          if (controller.signal.aborted) throw Object.assign(new Error('Codex 요청이 취소되었습니다.'), { statusCode: 499 });
          throw error;
        } finally {
          clearTimeout(timer);
          signal?.removeEventListener('abort', abort);
        }
      };
      return request.imageDataUrl
        ? withTemporaryAppearanceImage(request.imageDataUrl, run)
        : run();
    },
  };
}
