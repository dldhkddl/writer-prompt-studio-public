const IMAGE_ENDPOINT = 'https://api.openai.com/v1/images/generations';

export function createOpenAIImageGenerator({
  apiKey = process.env.OPENAI_API_KEY ?? '',
  fetchImpl = globalThis.fetch,
  model = 'gpt-image-2',
  timeoutMs = 120_000,
} = {}) {
  return {
    async generate({ prompt, size }, { signal } = {}) {
      if (!apiKey.trim()) {
        throw Object.assign(new Error('GPT 이미지 API 연결이 필요합니다. OPENAI_API_KEY를 설정하고 프로그램을 다시 시작해 주세요.'), { statusCode: 503 });
      }
      const controller = new AbortController();
      let timedOut = false;
      const abort = () => controller.abort();
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      timer.unref?.();
      try {
        const response = await fetchImpl(IMAGE_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, prompt, size, quality: 'medium', output_format: 'png' }),
          signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          const detail = typeof body?.error?.message === 'string' ? `: ${body.error.message}` : '';
          throw Object.assign(new Error(`OpenAI 이미지 생성 요청이 거부되었습니다${detail}`), { statusCode: response.status });
        }
        const base64 = body?.data?.[0]?.b64_json;
        if (typeof base64 !== 'string' || !base64) {
          throw Object.assign(new Error('OpenAI 이미지 응답 형식이 올바르지 않습니다.'), { statusCode: 502 });
        }
        return { imageDataUrl: `data:image/png;base64,${base64}`, mimeType: 'image/png', model };
      } catch (error) {
        if (timedOut) throw Object.assign(new Error('GPT 이미지 생성 시간이 초과되었습니다.'), { statusCode: 504 });
        if (controller.signal.aborted && !error?.statusCode) throw Object.assign(new Error('GPT 이미지 생성이 취소되었습니다.'), { statusCode: 499 });
        throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      }
    },
  };
}
