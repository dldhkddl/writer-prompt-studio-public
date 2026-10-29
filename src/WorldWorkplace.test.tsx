// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { Project } from './types';

const mocks = vi.hoisted(() => ({ saveProject: vi.fn(() => ({ ok: true as const })) }));
const project = {
  characters: [], relationships: [], trends: [], episodes: [],
  worlds: [{
    id: 'w1', name: '멍멍시', tone: '직장 코미디', setting: '현재 한국', rules: [],
    workplace: {
      companyName: '미정', industry: 'AI 영상·콘텐츠 제작 회사', department: 'AI 콘텐츠 기획팀',
      role: '신입사원', duties: '영상 아이디어 기획, 프롬프트 초안, 결과물 검수, 회의·촬영 보조',
    },
  }],
} as Project;

vi.mock('./storage', () => ({ loadProjectState: () => ({ project }), saveProject: mocks.saveProject }));
vi.mock('./image-store', () => ({
  deleteCharacterImage: vi.fn(), loadCharacterImage: vi.fn(async () => undefined), saveCharacterImage: vi.fn(async () => undefined),
}));

let root: Root | undefined;

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = '';
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('세계관 직장 설정', () => {
  it('고정 회사·부서·직무를 별도 항목으로 표시한다', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => { root?.render(<App />); });

    const worldButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === '세계관 · 관계');
    await act(async () => { (worldButton as HTMLButtonElement).click(); });

    const values = [...container.querySelectorAll('.field')].map((field) => ({
      label: field.querySelector('span')?.textContent,
      value: (field.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null)?.value,
    }));
    expect(values).toContainEqual({ label: '회사 업종', value: 'AI 영상·콘텐츠 제작 회사' });
    expect(values).toContainEqual({ label: '소속 부서', value: 'AI 콘텐츠 기획팀' });
    expect(values).toContainEqual({ label: '직급·역할', value: '신입사원' });
    expect(container.textContent).toContain('승인 없이 다른 직장 설정으로 변경하지 않음');
  });
});
