import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseAppearanceImageDataUrl } from './codex-contract.mjs';

const IMAGE_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export async function withTemporaryAppearanceImage(
  imageDataUrl,
  callback,
  { temporaryRoot = tmpdir() } = {},
) {
  const { mimeType, bytes } = parseAppearanceImageDataUrl(imageDataUrl);
  const requestDirectory = await mkdtemp(join(temporaryRoot, 'writer-appearance-'));
  const imagePath = join(requestDirectory, `appearance${IMAGE_EXTENSIONS[mimeType]}`);
  try {
    await writeFile(imagePath, bytes, { flag: 'wx', mode: 0o600 });
    return await callback(imagePath);
  } finally {
    await rm(requestDirectory, { recursive: true, force: true });
  }
}
