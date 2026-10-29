import {
  sanitizeAppearanceSuggestion,
  sanitizeHiggsfieldPrompt,
  sanitizeReferenceAssetSuggestions,
  sanitizeSeriesProposals,
  sanitizeStoryDraft,
  validateAppearanceRequest,
  validateHiggsfieldRequest,
  validateReferenceAssetRequest,
  validateSeriesProposalRequest,
  validateStoryRequest,
} from './codex-contract.mjs';
import { validateReferenceImageRequest } from './reference-image-contract.mjs';
import { randomBytes } from 'node:crypto';

const STORY_MAX_BODY_BYTES = 1024 * 1024;
const APPEARANCE_MAX_BODY_BYTES = 3 * 1024 * 1024;
const IMAGE_REQUEST_MAX_BODY_BYTES = 16 * 1024;
const BODY_TIMEOUT_MS = 10_000;
const isJsonContentType = (value) => value.split(';', 1)[0].trim() === 'application/json';

const sendJson = (response, status, value) => {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify(value));
};

const readJson = (request, timeoutMs, maxBytes) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  let settled = false;
  const finish = (callback, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    callback(value);
  };
  const fail = (message, statusCode) => finish(reject, Object.assign(new Error(message), { statusCode }));
  const timer = setTimeout(() => fail('요청 본문 전송 시간이 초과되었습니다.', 408), timeoutMs);
  timer.unref?.();
  request.on('data', (chunk) => {
    if (settled) return;
    size += chunk.length;
    if (size > maxBytes) { fail('요청 본문이 너무 큽니다.', 413); return; }
    chunks.push(chunk);
  });
  request.on('end', () => {
    if (settled) return;
    try { finish(resolve, JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
    catch { fail('JSON 요청 형식이 올바르지 않습니다.', 400); }
  });
  request.on('aborted', () => fail('요청 본문 전송이 중단되었습니다.', 400));
  request.on('error', (error) => finish(reject, error));
});

export function createCodexApiHandler(adapter, { bodyTimeoutMs = BODY_TIMEOUT_MS, imageGenerator } = {}) {
  let running = false;
  let imageRunning = false;
  const requestToken = randomBytes(32).toString('base64url');
  return async (request, response, next) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    if (request.method === 'GET' && pathname === '/api/health') {
      sendJson(response, 200, { app: 'writer-prompt-studio' });
      return;
    }
    if (request.method === 'GET' && pathname === '/api/codex/status') {
      try { sendJson(response, 200, { ...await adapter.getStatus(), requestToken }); }
      catch { sendJson(response, 200, { available: false, authenticated: false, message: 'Codex 실행 상태를 확인할 수 없습니다.', requestToken }); }
      return;
    }
    if (request.method === 'POST' && pathname === '/api/codex/story-draft') {
      const contentType = String(request.headers['content-type'] ?? '').toLowerCase();
      const token = String(request.headers['x-codex-request-token'] ?? '');
      const origin = String(request.headers.origin ?? '');
      const expectedOrigin = `http://${request.headers.host}`;
      if (token !== requestToken) { sendJson(response, 401, { message: 'Codex 실행 권한을 확인할 수 없습니다.' }); return; }
      if (origin && origin !== expectedOrigin) { sendJson(response, 403, { message: '허용되지 않은 Codex 실행 요청입니다.' }); return; }
      if (!isJsonContentType(contentType)) { sendJson(response, 415, { message: 'JSON 요청만 허용됩니다.' }); return; }
      let input;
      try { input = validateStoryRequest(await readJson(request, bodyTimeoutMs, STORY_MAX_BODY_BYTES)); }
      catch (error) {
        const status = Number(error?.statusCode) || 400;
        sendJson(response, status, { message: error.message });
        return;
      }
      if (running) { sendJson(response, 409, { message: '이미 Codex가 시나리오를 작성하고 있습니다.' }); return; }
      running = true;
      const controller = new AbortController();
      const abort = () => controller.abort();
      response.once('close', abort);
      try {
        const generated = await adapter.generateStoryDraft(input, { signal: controller.signal });
        const draft = sanitizeStoryDraft(generated.draft);
        sendJson(response, 200, { threadId: generated.threadId ?? '', draft, editorNotes: draft.editorNotes });
      } catch (error) {
        const status = Number(error?.statusCode) || (String(error?.message).includes('요청 데이터') ? 400 : 500);
        sendJson(response, status, { message: status === 500 ? 'Codex 시나리오 생성에 실패했습니다.' : error.message });
      } finally {
        response.off('close', abort);
        running = false;
      }
      return;
    }
    if (request.method === 'POST' && pathname === '/api/codex/appearance-suggestion') {
      const contentType = String(request.headers['content-type'] ?? '').toLowerCase();
      const token = String(request.headers['x-codex-request-token'] ?? '');
      const origin = String(request.headers.origin ?? '');
      const expectedOrigin = `http://${request.headers.host}`;
      if (token !== requestToken) { sendJson(response, 401, { message: 'Codex 실행 권한을 확인할 수 없습니다.' }); return; }
      if (origin && origin !== expectedOrigin) { sendJson(response, 403, { message: '허용되지 않은 Codex 실행 요청입니다.' }); return; }
      if (!isJsonContentType(contentType)) { sendJson(response, 415, { message: 'JSON 요청만 허용됩니다.' }); return; }
      let input;
      try { input = validateAppearanceRequest(await readJson(request, bodyTimeoutMs, APPEARANCE_MAX_BODY_BYTES)); }
      catch (error) {
        const status = Number(error?.statusCode) || 400;
        sendJson(response, status, { message: error.message });
        return;
      }
      if (running) { sendJson(response, 409, { message: '이미 Codex가 다른 작업을 진행하고 있습니다.' }); return; }
      running = true;
      const controller = new AbortController();
      const abort = () => controller.abort();
      response.once('close', abort);
      try {
        const generated = await adapter.generateAppearanceSuggestion(input, { signal: controller.signal });
        const suggestion = sanitizeAppearanceSuggestion({ appearance: generated.appearance });
        sendJson(response, 200, suggestion);
      } catch (error) {
        const status = Number(error?.statusCode) || (String(error?.message).includes('외형 제안 요청') ? 400 : 500);
        sendJson(response, status, { message: status === 500 ? 'Codex 외형 제안 생성에 실패했습니다.' : error.message });
      } finally {
        response.off('close', abort);
        running = false;
      }
      return;
    }
    if (request.method === 'POST' && pathname === '/api/codex/higgsfield-prompt') {
      const contentType = String(request.headers['content-type'] ?? '').toLowerCase();
      const token = String(request.headers['x-codex-request-token'] ?? '');
      const origin = String(request.headers.origin ?? '');
      const expectedOrigin = `http://${request.headers.host}`;
      if (token !== requestToken) { sendJson(response, 401, { message: 'Codex 실행 권한을 확인할 수 없습니다.' }); return; }
      if (origin && origin !== expectedOrigin) { sendJson(response, 403, { message: '허용되지 않은 Codex 실행 요청입니다.' }); return; }
      if (!isJsonContentType(contentType)) { sendJson(response, 415, { message: 'JSON 요청만 허용됩니다.' }); return; }
      let input;
      try { input = validateHiggsfieldRequest(await readJson(request, bodyTimeoutMs, STORY_MAX_BODY_BYTES)); }
      catch (error) {
        const status = Number(error?.statusCode) || 400;
        sendJson(response, status, { message: error.message });
        return;
      }
      if (running) { sendJson(response, 409, { message: '이미 Codex가 다른 작업을 진행하고 있습니다.' }); return; }
      running = true;
      const controller = new AbortController();
      const abort = () => controller.abort();
      response.once('close', abort);
      try {
        const generated = await adapter.generateHiggsfieldPrompt(input, { signal: controller.signal });
        sendJson(response, 200, sanitizeHiggsfieldPrompt({ prompt: generated.prompt }, input));
      } catch (error) {
        const status = Number(error?.statusCode) || (String(error?.message).includes('힉스필드 프롬프트 요청') ? 400 : 500);
        if (status === 500) console.error('[Codex 힉스필드 프롬프트 생성 실패]', error);
        sendJson(response, status, { message: status === 500 ? 'Codex 힉스필드 프롬프트 생성에 실패했습니다.' : error.message });
      } finally {
        response.off('close', abort);
        running = false;
      }
      return;
    }
    if (request.method === 'POST' && pathname === '/api/codex/reference-assets') {
      const contentType = String(request.headers['content-type'] ?? '').toLowerCase();
      const token = String(request.headers['x-codex-request-token'] ?? '');
      const origin = String(request.headers.origin ?? '');
      const expectedOrigin = `http://${request.headers.host}`;
      if (token !== requestToken) { sendJson(response, 401, { message: 'Codex 실행 권한을 확인할 수 없습니다.' }); return; }
      if (origin && origin !== expectedOrigin) { sendJson(response, 403, { message: '허용되지 않은 Codex 실행 요청입니다.' }); return; }
      if (!isJsonContentType(contentType)) { sendJson(response, 415, { message: 'JSON 요청만 허용됩니다.' }); return; }
      let input;
      try { input = validateReferenceAssetRequest(await readJson(request, bodyTimeoutMs, STORY_MAX_BODY_BYTES)); }
      catch (error) {
        const status = Number(error?.statusCode) || 400;
        sendJson(response, status, { message: error.message });
        return;
      }
      if (running) { sendJson(response, 409, { message: '이미 Codex가 다른 작업을 진행하고 있습니다.' }); return; }
      running = true;
      const controller = new AbortController();
      const abort = () => controller.abort();
      response.once('close', abort);
      try {
        const generated = await adapter.generateReferenceAssetSuggestions(input, { signal: controller.signal });
        sendJson(response, 200, sanitizeReferenceAssetSuggestions({ assets: generated.assets }));
      } catch (error) {
        const status = Number(error?.statusCode) || (String(error?.message).includes('장면 필요 이미지') ? 400 : 500);
        sendJson(response, status, { message: status === 500 ? 'Codex 장면 필요 이미지 제안에 실패했습니다.' : error.message });
      } finally {
        response.off('close', abort);
        running = false;
      }
      return;
    }
    if (request.method === 'POST' && pathname === '/api/images/generate') {
      const contentType = String(request.headers['content-type'] ?? '').toLowerCase();
      const token = String(request.headers['x-codex-request-token'] ?? '');
      const origin = String(request.headers.origin ?? '');
      const expectedOrigin = `http://${request.headers.host}`;
      if (token !== requestToken) { sendJson(response, 401, { message: '이미지 생성 권한을 확인할 수 없습니다.' }); return; }
      if (origin && origin !== expectedOrigin) { sendJson(response, 403, { message: '허용되지 않은 이미지 생성 요청입니다.' }); return; }
      if (!isJsonContentType(contentType)) { sendJson(response, 415, { message: 'JSON 요청만 허용됩니다.' }); return; }
      let input;
      try { input = validateReferenceImageRequest(await readJson(request, bodyTimeoutMs, IMAGE_REQUEST_MAX_BODY_BYTES)); }
      catch (error) {
        const status = Number(error?.statusCode) || 400;
        sendJson(response, status, { message: error.message });
        return;
      }
      if (!imageGenerator) { sendJson(response, 503, { message: 'GPT 이미지 생성기가 연결되지 않았습니다.' }); return; }
      if (imageRunning) { sendJson(response, 409, { message: '이미 다른 이미지를 생성하고 있습니다.' }); return; }
      imageRunning = true;
      const controller = new AbortController();
      const abort = () => controller.abort();
      response.once('close', abort);
      try {
        const generated = await imageGenerator.generate({ prompt: input.imagePrompt, size: input.size }, { signal: controller.signal });
        sendJson(response, 200, { imageDataUrl: generated.imageDataUrl, mimeType: generated.mimeType, model: generated.model });
      } catch (error) {
        const status = Number(error?.statusCode) || 500;
        const safeMessage = [400, 401, 403, 429, 499, 502, 503, 504].includes(status) ? error.message : 'GPT 이미지 생성에 실패했습니다.';
        sendJson(response, status, { message: safeMessage });
      } finally {
        response.off('close', abort);
        imageRunning = false;
      }
      return;
    }
    if (request.method === 'POST' && pathname === '/api/codex/series-proposals') {
      const contentType = String(request.headers['content-type'] ?? '').toLowerCase();
      const token = String(request.headers['x-codex-request-token'] ?? '');
      const origin = String(request.headers.origin ?? '');
      const expectedOrigin = `http://${request.headers.host}`;
      if (token !== requestToken) { sendJson(response, 401, { message: 'Codex 실행 권한을 확인할 수 없습니다.' }); return; }
      if (origin && origin !== expectedOrigin) { sendJson(response, 403, { message: '허용되지 않은 Codex 실행 요청입니다.' }); return; }
      if (!isJsonContentType(contentType)) { sendJson(response, 415, { message: 'JSON 요청만 허용됩니다.' }); return; }
      let input;
      try { input = validateSeriesProposalRequest(await readJson(request, bodyTimeoutMs, STORY_MAX_BODY_BYTES)); }
      catch (error) {
        const status = Number(error?.statusCode) || 400;
        sendJson(response, status, { message: error.message });
        return;
      }
      if (running) { sendJson(response, 409, { message: '이미 Codex가 다른 작업을 진행하고 있습니다.' }); return; }
      running = true;
      const controller = new AbortController();
      const abort = () => controller.abort();
      response.once('close', abort);
      try {
        const generated = await adapter.generateSeriesProposals(input, { signal: controller.signal });
        sendJson(response, 200, sanitizeSeriesProposals({ proposals: generated.proposals }, input));
      } catch (error) {
        const status = Number(error?.statusCode) || (String(error?.message).includes('연재') ? 400 : 500);
        sendJson(response, status, { message: status === 500 ? 'Codex 연재 제안 생성에 실패했습니다.' : error.message });
      } finally {
        response.off('close', abort);
        running = false;
      }
      return;
    }
    if (typeof next === 'function') next();
    else sendJson(response, 404, { message: '찾을 수 없는 API입니다.' });
  };
}
