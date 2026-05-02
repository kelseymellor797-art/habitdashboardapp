const DB_NAME = "habitflow-local-media";
const DB_VERSION = 1;
const STORE_NAME = "files";
export const LOCAL_MEDIA_URL_PREFIX = "local-media://";

type StoredMediaFile = {
  id: string;
  file: Blob;
  name: string;
  type: string;
  size: number;
  updatedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = action(store);

        if (request) {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } else {
          tx.oncomplete = () => resolve(undefined);
        }

        tx.onerror = () => reject(tx.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

export function makeLocalMediaUrl(id: string): string {
  return `${LOCAL_MEDIA_URL_PREFIX}${id}`;
}

export function getLocalMediaId(url: string): string | null {
  return url.startsWith(LOCAL_MEDIA_URL_PREFIX) ? url.slice(LOCAL_MEDIA_URL_PREFIX.length) : null;
}

export async function saveLocalMediaFile(id: string, file: File): Promise<void> {
  const record: StoredMediaFile = {
    id,
    file,
    name: file.name,
    type: file.type,
    size: file.size,
    updatedAt: new Date().toISOString(),
  };
  await withStore("readwrite", (store) => store.put(record));
}

export async function getLocalMediaFile(id: string): Promise<StoredMediaFile | null> {
  const record = await withStore<StoredMediaFile>("readonly", (store) => store.get(id));
  return record ?? null;
}

export async function getLocalMediaObjectUrl(id: string): Promise<string | null> {
  const record = await getLocalMediaFile(id);
  return record ? URL.createObjectURL(record.file) : null;
}

export async function deleteLocalMediaFile(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}
