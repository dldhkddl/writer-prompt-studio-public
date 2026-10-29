import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteCharacterImage, deleteReferenceAssetImage, loadReferenceAssetImage, saveReferenceAssetImage } from './image-store';

function createIndexedDbDouble() {
  const deleteRecord = vi.fn();
  const close = vi.fn();
  const transaction = {
    error: null,
    onabort: null as (() => void) | null,
    oncomplete: null as (() => void) | null,
    onerror: null as (() => void) | null,
    objectStore: vi.fn(() => ({ delete: deleteRecord })),
  };
  const database = {
    close,
    transaction: vi.fn(() => transaction),
  };
  const openRequest = {
    error: null,
    result: database,
    onerror: null as (() => void) | null,
    onsuccess: null as (() => void) | null,
    onupgradeneeded: null as (() => void) | null,
  };
  vi.stubGlobal('indexedDB', { open: vi.fn(() => openRequest) });
  return { close, database, deleteRecord, openRequest, transaction };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('캐릭터 이미지 삭제', () => {
  it('대상 캐릭터 ID로 저장된 사진을 삭제하고 데이터베이스를 닫는다', async () => {
    const fake = createIndexedDbDouble();

    const deletion = deleteCharacterImage('c1');
    fake.openRequest.onsuccess?.();
    await Promise.resolve();

    expect(fake.database.transaction).toHaveBeenCalledWith('캐릭터-이미지', 'readwrite');
    expect(fake.deleteRecord).toHaveBeenCalledWith('c1');

    fake.transaction.oncomplete?.();
    await deletion;
    expect(fake.close).toHaveBeenCalledOnce();
  });

  it('사진 삭제 트랜잭션이 실패하면 오류를 전달하고 데이터베이스를 닫는다', async () => {
    const fake = createIndexedDbDouble();

    const deletion = deleteCharacterImage('c1');
    fake.openRequest.onsuccess?.();
    await Promise.resolve();
    fake.transaction.onerror?.();

    await expect(deletion).rejects.toThrow('이미지를 삭제하지 못했습니다.');
    expect(fake.close).toHaveBeenCalledOnce();
  });

  it('사진 삭제 트랜잭션이 중단돼도 대기를 끝내고 오류를 전달한다', async () => {
    const fake = createIndexedDbDouble();

    const deletion = deleteCharacterImage('c1');
    fake.openRequest.onsuccess?.();
    await Promise.resolve();
    fake.transaction.onabort?.();

    await expect(deletion).rejects.toThrow('이미지를 삭제하지 못했습니다.');
    expect(fake.close).toHaveBeenCalledOnce();
  });
});

describe('장면 참고 이미지 저장', () => {
  it('항목 ID로 생성 이미지를 전용 저장소에 보관한다', async () => {
    const put = vi.fn();
    const transaction = { error: null, oncomplete: null as (() => void) | null, onerror: null as (() => void) | null, objectStore: vi.fn(() => ({ put })) };
    const database = { close: vi.fn(), transaction: vi.fn(() => transaction) };
    const openRequest = { error: null, result: database, onerror: null as (() => void) | null, onsuccess: null as (() => void) | null, onupgradeneeded: null as (() => void) | null };
    vi.stubGlobal('indexedDB', { open: vi.fn(() => openRequest) });

    const saving = saveReferenceAssetImage('a1', 'data:image/png;base64,AAAA');
    openRequest.onsuccess?.();
    await Promise.resolve();
    expect(database.transaction).toHaveBeenCalledWith('장면-필요-이미지', 'readwrite');
    expect(put).toHaveBeenCalledWith('data:image/png;base64,AAAA', 'a1');
    transaction.oncomplete?.();
    await saving;
    expect(database.close).toHaveBeenCalledOnce();
  });

  it('항목 ID로 생성 이미지를 불러온다', async () => {
    const getRequest = { result: 'data:image/png;base64,AAAA', error: null, onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
    const database = { close: vi.fn(), transaction: vi.fn(() => ({ objectStore: () => ({ get: vi.fn(() => getRequest) }) })) };
    const openRequest = { error: null, result: database, onerror: null as (() => void) | null, onsuccess: null as (() => void) | null, onupgradeneeded: null as (() => void) | null };
    vi.stubGlobal('indexedDB', { open: vi.fn(() => openRequest) });

    const loading = loadReferenceAssetImage('a1');
    openRequest.onsuccess?.();
    await Promise.resolve();
    getRequest.onsuccess?.();
    await expect(loading).resolves.toBe('data:image/png;base64,AAAA');
    expect(database.close).toHaveBeenCalledOnce();
  });

  it('카드를 삭제하면 저장된 생성 이미지도 삭제한다', async () => {
    const remove = vi.fn();
    const transaction = { error: null, onabort: null as (() => void) | null, oncomplete: null as (() => void) | null, onerror: null as (() => void) | null, objectStore: vi.fn(() => ({ delete: remove })) };
    const database = { close: vi.fn(), transaction: vi.fn(() => transaction) };
    const openRequest = { error: null, result: database, onerror: null as (() => void) | null, onsuccess: null as (() => void) | null, onupgradeneeded: null as (() => void) | null };
    vi.stubGlobal('indexedDB', { open: vi.fn(() => openRequest) });

    const deleting = deleteReferenceAssetImage('a1');
    openRequest.onsuccess?.();
    await Promise.resolve();
    expect(remove).toHaveBeenCalledWith('a1');
    transaction.oncomplete?.();
    await deleting;
    expect(database.close).toHaveBeenCalledOnce();
  });
});
