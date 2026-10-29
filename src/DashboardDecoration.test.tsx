// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { Project } from './types';

const project: Project = {
  characters: [], worlds: [], relationships: [], trends: [], episodes: [],
};

vi.mock('./storage', () => ({
  loadProjectState: () => ({ project }),
  saveProject: () => ({ ok: true }),
}));
vi.mock('./image-store', () => ({
  deleteCharacterImage: vi.fn(),
  loadCharacterImage: vi.fn(async () => undefined),
  saveCharacterImage: vi.fn(async () => undefined),
}));

let root: Root | undefined;

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('작업 개요 장식', () => {
  it('기능과 연결되지 않은 샘플 작업 카드를 표시하지 않는다', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => { root?.render(<App />); });

    expect(container.textContent).not.toContain('밤톨의 편의점 알바');
    expect(container.textContent).not.toContain('장면 03 / 반전');
    expect(container.textContent).not.toContain('character locked');
  });
});
