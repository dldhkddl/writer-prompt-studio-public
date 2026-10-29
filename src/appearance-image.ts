export type AppearanceImageProcessor = {
  load: (dataUrl: string) => Promise<{ width: number; height: number; source: unknown }>;
  encode: (source: unknown, width: number, height: number, mimeType: string, quality: number) => Promise<string>;
};

const MAX_SIDE = 1280;
const MAX_BYTES = 2 * 1024 * 1024;
const QUALITY_STEPS = [0.9, 0.78, 0.66, 0.54];
const SCALE_STEPS = [1, 0.85, 0.7, 0.55];

function parseBase64DataUrl(dataUrl: string) {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl);
  if (!match || match[2].length % 4 !== 0) throw new Error('지원되는 이미지 데이터가 아닙니다.');
  return { mimeType: `image/${match[1].toLowerCase()}`, base64: match[2] };
}

export function calculateContainSize(width: number, height: number, maxSide: number) {
  if (width <= 0 || height <= 0 || maxSide <= 0) throw new Error('이미지 크기가 올바르지 않습니다.');
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function dataUrlByteLength(dataUrl: string) {
  const { base64 } = parseBase64DataUrl(dataUrl);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length * 3) / 4 - padding;
}

const browserImageProcessor: AppearanceImageProcessor = {
  load: (dataUrl) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight, source: image });
    image.onerror = () => reject(new Error('선택한 사진을 읽을 수 없습니다.'));
    image.src = dataUrl;
  }),
  encode: async (source, width, height, mimeType, quality) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('사진 축소 기능을 사용할 수 없습니다.');
    context.drawImage(source as CanvasImageSource, 0, 0, width, height);
    return canvas.toDataURL(mimeType, quality);
  },
};

export async function createAppearanceAnalysisCopy(
  originalDataUrl: string,
  processor: AppearanceImageProcessor = browserImageProcessor,
): Promise<string> {
  dataUrlByteLength(originalDataUrl);
  const loaded = await processor.load(originalDataUrl);
  const target = calculateContainSize(loaded.width, loaded.height, MAX_SIDE);
  if (target.width === loaded.width && target.height === loaded.height && dataUrlByteLength(originalDataUrl) <= MAX_BYTES) {
    return originalDataUrl;
  }
  for (const scale of SCALE_STEPS) {
    const width = Math.max(1, Math.round(target.width * scale));
    const height = Math.max(1, Math.round(target.height * scale));
    for (const quality of QUALITY_STEPS) {
      const encoded = await processor.encode(loaded.source, width, height, 'image/webp', quality);
      if (dataUrlByteLength(encoded) <= MAX_BYTES) return encoded;
    }
  }
  throw new Error('분석용 사진을 2MB 이하로 줄이지 못했습니다. 다른 사진을 선택해주세요.');
}
