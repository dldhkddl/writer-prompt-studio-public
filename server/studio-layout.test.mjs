import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = [
  readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8'),
  readFileSync(new URL('../src/studio-layout-fix.css', import.meta.url), 'utf8'),
].join('\n');

describe('장면 작업실 긴 문장 레이아웃', () => {
  it('장면 설명이 왼쪽 열을 넘어 편집기 뒤로 침범하지 않는다', () => {
    expect(css).toMatch(/\.scene-column\s*,\s*\.scene-editor-column\s*\{[^}]*min-width\s*:\s*0/i);
    expect(css).toMatch(/\.scene-card\s*\{[^}]*overflow\s*:\s*hidden/i);
    expect(css).toMatch(/\.scene-copy\s*\{[^}]*min-width\s*:\s*0/i);
  });
});
