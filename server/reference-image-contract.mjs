const CATEGORIES = new Set(['environment', 'wardrobe', 'prop', 'screen']);
const cleanText = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

export function validateReferenceImageRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('장면 이미지 생성 요청 구조가 올바르지 않습니다.');
  const assetId = cleanText(value.assetId, 200);
  const keyword = cleanText(value.keyword, 100);
  const imagePrompt = cleanText(value.imagePrompt, 4000);
  const sceneTitle = cleanText(value.sceneTitle, 200);
  if (!assetId || !keyword || !imagePrompt || !sceneTitle || !CATEGORIES.has(value.category)) throw new Error('장면 이미지 생성 요청의 필수 정보가 비어 있습니다.');
  return {
    assetId, keyword, category: value.category, imagePrompt, sceneTitle,
    size: value.category === 'environment' ? '1024x1536' : '1024x1024',
  };
}
