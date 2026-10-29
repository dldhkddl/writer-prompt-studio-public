const DATABASE_NAME = '작가-프롬프트-스튜디오-이미지';
const STORE_NAME = '캐릭터-이미지';
const SCENE_STORE_NAME = '장면-기준-이미지';
const REFERENCE_ASSET_STORE_NAME = '장면-필요-이미지';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 3);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      if (!request.result.objectStoreNames.contains(SCENE_STORE_NAME)) request.result.createObjectStore(SCENE_STORE_NAME);
      if (!request.result.objectStoreNames.contains(REFERENCE_ASSET_STORE_NAME)) request.result.createObjectStore(REFERENCE_ASSET_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('이미지 저장소를 열 수 없습니다.'));
  });
}

export async function saveSceneReferenceImage(sceneId: string, imageDataUrl: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(SCENE_STORE_NAME, 'readwrite');
    transaction.objectStore(SCENE_STORE_NAME).put(imageDataUrl, sceneId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('장면 기준 이미지를 저장하지 못했습니다.'));
  });
  database.close();
}

export async function loadSceneReferenceImage(sceneId: string): Promise<string | undefined> {
  const database = await openDatabase();
  const result = await new Promise<string | undefined>((resolve, reject) => {
    const request = database.transaction(SCENE_STORE_NAME, 'readonly').objectStore(SCENE_STORE_NAME).get(sceneId);
    request.onsuccess = () => resolve(request.result as string | undefined);
    request.onerror = () => reject(request.error ?? new Error('장면 기준 이미지를 불러오지 못했습니다.'));
  });
  database.close();
  return result;
}

export async function saveReferenceAssetImage(assetId: string, imageDataUrl: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(REFERENCE_ASSET_STORE_NAME, 'readwrite');
    transaction.objectStore(REFERENCE_ASSET_STORE_NAME).put(imageDataUrl, assetId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('생성 이미지를 저장하지 못했습니다.'));
  });
  database.close();
}

export async function loadReferenceAssetImage(assetId: string): Promise<string | undefined> {
  const database = await openDatabase();
  const result = await new Promise<string | undefined>((resolve, reject) => {
    const request = database.transaction(REFERENCE_ASSET_STORE_NAME, 'readonly').objectStore(REFERENCE_ASSET_STORE_NAME).get(assetId);
    request.onsuccess = () => resolve(request.result as string | undefined);
    request.onerror = () => reject(request.error ?? new Error('생성 이미지를 불러오지 못했습니다.'));
  });
  database.close();
  return result;
}

export async function deleteReferenceAssetImage(assetId: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(REFERENCE_ASSET_STORE_NAME, 'readwrite');
      const rejectDeletion = () => reject(transaction.error ?? new Error('생성 이미지를 삭제하지 못했습니다.'));
      transaction.objectStore(REFERENCE_ASSET_STORE_NAME).delete(assetId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = rejectDeletion;
      transaction.onabort = rejectDeletion;
    });
  } finally {
    database.close();
  }
}

export async function saveCharacterImage(characterId: string, imageDataUrl: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(imageDataUrl, characterId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('이미지를 저장하지 못했습니다.'));
  });
  database.close();
}

export async function loadCharacterImage(characterId: string): Promise<string | undefined> {
  const database = await openDatabase();
  const result = await new Promise<string | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(characterId);
    request.onsuccess = () => resolve(request.result as string | undefined);
    request.onerror = () => reject(request.error ?? new Error('이미지를 불러오지 못했습니다.'));
  });
  database.close();
  return result;
}

export async function deleteCharacterImage(characterId: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const rejectDeletion = () => reject(transaction.error ?? new Error('이미지를 삭제하지 못했습니다.'));
      transaction.objectStore(STORE_NAME).delete(characterId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = rejectDeletion;
      transaction.onabort = rejectDeletion;
    });
  } finally {
    database.close();
  }
}
