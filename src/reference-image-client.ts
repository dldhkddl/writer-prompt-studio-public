import type { ReferenceAssetCategory } from './types';

export type ReferenceImageRequest = { assetId: string; keyword: string; category: ReferenceAssetCategory; imagePrompt: string; sceneTitle: string };
export type ReferenceImageResponse = { imageDataUrl: string; mimeType: 'image/png'; model: string };

export async function requestReferenceImage(input: ReferenceImageRequest, requestToken: string, signal?: AbortSignal): Promise<ReferenceImageResponse> {
  try {
    const response = await fetch('/api/images/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'x-codex-request-token': requestToken },
      body: JSON.stringify(input), signal,
    });
    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = isRecord(body) && typeof body.message === 'string' ? body.message : 'GPT 이미지 생성 요청에 실패했습니다.';
      throw new Error(message);
    }
    if (!isRecord(body) || Object.keys(body).length !== 3 || typeof body.imageDataUrl !== 'string' || !body.imageDataUrl.startsWith('data:image/png;base64,') || body.mimeType !== 'image/png' || typeof body.model !== 'string' || !body.model) {
      throw new Error('GPT 이미지 생성 응답 형식이 올바르지 않습니다.');
    }
    return body as ReferenceImageResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (error instanceof TypeError) throw new Error('로컬 이미지 생성 서버에 연결할 수 없습니다.');
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
