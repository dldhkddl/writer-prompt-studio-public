import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { withTemporaryAppearanceImage } from './appearance-image.mjs';

const temporaryRoots = [];

async function createTemporaryRoot() {
  const root = await mkdtemp(join(tmpdir(), 'writer-appearance-test-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('외형 분석 임시 이미지', () => {
  it('콜백이 실행되는 동안만 올바른 확장자의 파일을 유지한다', async () => {
    const temporaryRoot = await createTemporaryRoot();
    let capturedPath = '';

    const result = await withTemporaryAppearanceImage(
      'data:image/png;base64,iVBORw0KGgo=',
      async (imagePath) => {
        capturedPath = imagePath;
        expect(existsSync(imagePath)).toBe(true);
        expect(extname(imagePath)).toBe('.png');
        return '완료';
      },
      { temporaryRoot },
    );

    expect(result).toBe('완료');
    expect(dirname(capturedPath)).not.toBe(temporaryRoot);
    expect(existsSync(capturedPath)).toBe(false);
    expect(existsSync(dirname(capturedPath))).toBe(false);
  });

  it('콜백이 실패하거나 취소되어도 임시 파일을 삭제한다', async () => {
    const temporaryRoot = await createTemporaryRoot();
    let capturedPath = '';
    const aborted = Object.assign(new Error('취소'), { name: 'AbortError' });

    await expect(withTemporaryAppearanceImage(
      'data:image/webp;base64,UklGRg==',
      async (imagePath) => {
        capturedPath = imagePath;
        throw aborted;
      },
      { temporaryRoot },
    )).rejects.toBe(aborted);

    expect(existsSync(capturedPath)).toBe(false);
    expect(existsSync(dirname(capturedPath))).toBe(false);
  });
});
