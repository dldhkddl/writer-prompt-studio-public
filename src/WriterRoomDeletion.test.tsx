// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WriterRoom from './WriterRoom';
import type { Episode, Project } from './types';

vi.mock('./CodexWriterPanel', () => ({ default: () => <div>작가 제안</div> }));

const episode: Episode = { id: 'e1', title: '삭제할 에피소드', idea: '', characterIds: [], scenes: [], status: 'draft', updatedAt: '', beats: [] };
const project: Project = { characters: [], worlds: [], relationships: [], episodes: [episode], trends: [] };
let root: Root | undefined;

function findButton(container: HTMLElement, label: string) {
  const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.trim().includes(label));
  if (!button) throw new Error(`${label} 버튼을 찾지 못했습니다.`);
  return button as HTMLButtonElement;
}

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('에피소드 삭제 확인', () => {
  it('화면 안에서 삭제 영향을 확인한 뒤에만 삭제를 요청한다', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const onDeleteEpisode = vi.fn().mockResolvedValue(true);
    root = createRoot(container);
    act(() => root?.render(<WriterRoom project={project} episode={episode} onSelectEpisode={vi.fn()} onUpdateEpisode={vi.fn()} onOpenStudio={vi.fn()} onDeleteEpisode={onDeleteEpisode} onUpdatePlan={vi.fn()} onApproveProposal={vi.fn()} />));

    act(() => findButton(container, '에피소드 삭제').click());
    expect(onDeleteEpisode).not.toHaveBeenCalled();
    expect(container.textContent).toContain('모든 장면과 적용한 프롬프트');
    expect(container.textContent).toContain('0개 장면');

    await act(async () => {
      findButton(container, '삭제하기').click();
      await Promise.resolve();
    });
    expect(onDeleteEpisode).toHaveBeenCalledWith('e1');
  });

  it('삭제 확인 중 다른 에피소드로 바뀌면 확인창을 닫는다', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const nextEpisode = { ...episode, id: 'e2', title: '다른 에피소드' };
    const nextProject = { ...project, episodes: [episode, nextEpisode] };
    const props = { project: nextProject, onSelectEpisode: vi.fn(), onUpdateEpisode: vi.fn(), onOpenStudio: vi.fn(), onDeleteEpisode: vi.fn().mockResolvedValue(true), onUpdatePlan: vi.fn(), onApproveProposal: vi.fn() };
    root = createRoot(container);
    act(() => root?.render(<WriterRoom {...props} episode={episode} />));
    act(() => findButton(container, '에피소드 삭제').click());
    expect(container.querySelector('.episode-delete-confirmation')).not.toBeNull();

    act(() => root?.render(<WriterRoom {...props} episode={nextEpisode} />));
    expect(container.querySelector('.episode-delete-confirmation')).toBeNull();
  });
});
