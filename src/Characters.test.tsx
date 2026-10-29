// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Characters } from './App';
import { removeCharacterFromProject } from './project-updates';
import type { Character, Project } from './types';

vi.mock('./CharacterAppearancePanel', () => ({ default: () => null }));

const firstCharacter: Character = {
  id: 'c1',
  name: '밤톨',
  type: 'animal',
  appearance: '',
  personality: '',
  voice: '',
  habits: '',
  likes: '',
  dislikes: '',
};

const secondCharacter: Character = { ...firstCharacter, id: 'c2', name: '친구' };
const thirdCharacter: Character = { ...firstCharacter, id: 'c3', name: '이웃' };

function createProject(characters: Character[]): Project {
  return { characters, worlds: [], relationships: [], episodes: [], trends: [] };
}

let root: Root | undefined;

function renderCharacters(project: Project, onDelete = vi.fn(async () => true)) {
  const container = document.createElement('div');
  document.body.append(container);
  const onAdd = vi.fn(() => ({ ...firstCharacter, id: '새-캐릭터', name: '새 캐릭터' }));
  const onUpdate = vi.fn();
  root = createRoot(container);
  act(() => root?.render(
    <Characters project={project} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />,
  ));
  return { container, onAdd, onUpdate, onDelete };
}

function button(container: HTMLElement, label: string) {
  const match = [...container.querySelectorAll('button')]
    .find((item) => item.textContent?.trim() === label);
  if (!match) throw new Error(`${label} 버튼을 찾지 못했습니다.`);
  return match as HTMLButtonElement;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('캐릭터 삭제 화면', () => {
  it('성별과 행동 방식을 선택해 캐릭터 설정으로 저장한다', () => {
    const { container, onUpdate } = renderCharacters(createProject([firstCharacter]));
    const selectByLabel = (label: string) => {
      const field = [...container.querySelectorAll('label')].find((item) => item.querySelector('span')?.textContent === label);
      return field?.querySelector('select') as HTMLSelectElement;
    };
    const gender = selectByLabel('성별·목소리');
    const behavior = selectByLabel('행동 방식');

    expect([...gender.options].map((option) => option.text)).toEqual(['여성', '남성', '중성', '지정 안 함']);
    expect([...behavior.options].map((option) => option.text)).toEqual(['사람처럼 행동', '동물처럼 행동', '혼합']);
    act(() => { gender.value = 'female'; gender.dispatchEvent(new Event('change', { bubbles: true })); });
    act(() => { behavior.value = 'humanlike'; behavior.dispatchEvent(new Event('change', { bubbles: true })); });

    expect(onUpdate).toHaveBeenCalledWith('c1', { gender: 'female' });
    expect(onUpdate).toHaveBeenCalledWith('c1', { behaviorStyle: 'humanlike' });
  });

  it('첫 클릭에는 삭제 영향을 확인시키고 취소하면 삭제하지 않는다', () => {
    const { container, onDelete } = renderCharacters(createProject([firstCharacter]));

    act(() => button(container, '캐릭터 삭제').click());
    expect(onDelete).not.toHaveBeenCalled();
    expect(container.textContent).toContain('되돌릴 수 없습니다');

    act(() => button(container, '취소').click());
    expect(onDelete).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('되돌릴 수 없습니다');
  });

  it('마지막 캐릭터를 삭제하면 빈 보관함에서 새 캐릭터 추가 버튼을 표시한다', async () => {
    function Harness() {
      const [project, setProject] = useState(createProject([firstCharacter]));
      const deleteCharacter = async (characterId: string) => {
        setProject((current) => removeCharacterFromProject(current, characterId));
        return true;
      };
      return <Characters project={project} onAdd={() => firstCharacter} onUpdate={() => {}} onDelete={deleteCharacter} />;
    }

    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<Harness />));

    act(() => button(container, '캐릭터 삭제').click());
    await act(async () => button(container, '삭제하기').click());

    expect(container.textContent).toContain('아직 등록된 캐릭터가 없어요');
    expect(button(container, '새 캐릭터 추가')).toBeTruthy();
  });

  it('삭제 확인 중 다른 캐릭터를 선택하면 확인을 닫는다', () => {
    const { container } = renderCharacters(createProject([firstCharacter, secondCharacter]));

    act(() => button(container, '캐릭터 삭제').click());
    const friend = [...container.querySelectorAll('.character-list-item')]
      .find((item) => item.textContent?.includes('친구')) as HTMLButtonElement;
    act(() => friend.click());

    expect(container.textContent).not.toContain('되돌릴 수 없습니다');
  });

  it('삭제 요청 중 사용자가 고른 다른 캐릭터를 완료 시점에 덮어쓰지 않는다', async () => {
    let finishDeletion: ((deleted: boolean) => void) | undefined;
    const onDelete = vi.fn(() => new Promise<boolean>((resolve) => { finishDeletion = resolve; }));
    const { container } = renderCharacters(
      createProject([firstCharacter, secondCharacter, thirdCharacter]),
      onDelete,
    );

    act(() => button(container, '캐릭터 삭제').click());
    act(() => button(container, '삭제하기').click());
    const neighbor = [...container.querySelectorAll('.character-list-item')]
      .find((item) => item.textContent?.includes('이웃')) as HTMLButtonElement;
    act(() => neighbor.click());

    await act(async () => {
      finishDeletion?.(true);
      await Promise.resolve();
    });

    expect(container.querySelector('.character-list-item.selected')?.textContent).toContain('이웃');
  });
});
