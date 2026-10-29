import type { ReferenceAssetSuggestion } from './types';

const categories = new Set(['environment', 'wardrobe', 'prop', 'screen']);
const priorities = new Set(['required', 'optional']);

export async function requestReferenceAssetSuggestions(input: unknown, requestToken: string, signal?: AbortSignal): Promise<{ assets: ReferenceAssetSuggestion[] }> {
  try {
    const response = await fetch('/api/codex/reference-assets', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'x-codex-request-token': requestToken },
      body: JSON.stringify(input), signal,
    });
    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = isRecord(body) && typeof body.message === 'string' ? body.message : 'Codex 장면 필요 이미지 요청에 실패했습니다.';
      throw new Error(message);
    }
    if (!isReferenceAssetResponse(body)) throw new Error('Codex 장면 필요 이미지 응답 형식이 올바르지 않습니다.');
    return body;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (error instanceof TypeError) throw new Error('Codex 로컬 서버에 연결할 수 없습니다.');
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isReferenceAssetResponse(value: unknown): value is { assets: ReferenceAssetSuggestion[] } {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !Array.isArray(value.assets) || value.assets.length < 3 || value.assets.length > 6) return false;
  const keywords = new Set<string>();
  return value.assets.every((asset) => {
    if (!isRecord(asset) || Object.keys(asset).length !== 5) return false;
    if (typeof asset.keyword !== 'string' || !asset.keyword.trim() || typeof asset.reason !== 'string' || !asset.reason.trim() || typeof asset.imagePrompt !== 'string' || !asset.imagePrompt.trim()) return false;
    if (typeof asset.category !== 'string' || !categories.has(asset.category) || typeof asset.priority !== 'string' || !priorities.has(asset.priority)) return false;
    const key = asset.keyword.trim().toLocaleLowerCase('ko-KR');
    if (keywords.has(key)) return false;
    keywords.add(key);
    return true;
  });
}
