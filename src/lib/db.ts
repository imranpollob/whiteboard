/**
 * Lightweight IndexedDB key-value wrapper (no external dependencies).
 *
 * One database (`whiteboard`), one object store (`boards`), keyed by board id.
 * Falls back to an in-memory map when IndexedDB is unavailable (SSR, tests,
 * or privacy modes that throw on `indexedDB.open`), so callers never branch.
 */

export const DB_NAME = "whiteboard";
export const BOARD_STORE = "boards";
const DB_VERSION = 1;

type StoredValue = unknown;

function indexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BOARD_STORE)) {
        db.createObjectStore(BOARD_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB.open failed"));
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let settled = false;
        const tx = db.transaction(BOARD_STORE, mode);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          if (!settled) {
            settled = true;
            reject(tx.error ?? new Error("IndexedDB transaction failed"));
          }
          db.close();
        };
        let req: IDBRequest<T>;
        try {
          req = fn(tx.objectStore(BOARD_STORE));
        } catch (err) {
          db.close();
          reject(err);
          return;
        }
        req.onsuccess = () => {
          if (!settled) {
            settled = true;
            resolve(req.result);
          }
        };
        req.onerror = () => {
          if (!settled) {
            settled = true;
            reject(req.error ?? new Error("IndexedDB request failed"));
          }
        };
      }),
  );
}

/** Minimal async key-value interface over the boards store. */
export interface KeyValueStore {
  getAll(): Promise<StoredValue[]>;
  /** Store keys in the same order as `getAll()` so callers can pair them. */
  keys(): Promise<string[]>;
  get(key: string): Promise<StoredValue | undefined>;
  put(key: string, value: StoredValue): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

class IndexedDBStore implements KeyValueStore {
  getAll(): Promise<StoredValue[]> {
    return run<unknown[]>("readonly", (s) => s.getAll()).then((rows) =>
      Array.isArray(rows) ? rows : [],
    );
  }
  keys(): Promise<string[]> {
    return run<IDBValidKey[]>("readonly", (s) => s.getAllKeys()).then((keys) =>
      Array.isArray(keys) ? keys.map(String) : [],
    );
  }
  get(key: string): Promise<StoredValue | undefined> {
    return run<unknown>("readonly", (s) => s.get(key)).then(
      (v) => (v === undefined ? undefined : v),
      (err) => {
        throw err;
      },
    );
  }
  put(key: string, value: StoredValue): Promise<void> {
    return run("readwrite", (s) => s.put(value, key)).then(() => undefined);
  }
  remove(key: string): Promise<void> {
    return run("readwrite", (s) => s.delete(key)).then(() => undefined);
  }
  clear(): Promise<void> {
    return run("readwrite", (s) => s.clear()).then(() => undefined);
  }
}

class MemoryStore implements KeyValueStore {
  private map = new Map<string, StoredValue>();
  getAll(): Promise<StoredValue[]> {
    return Promise.resolve([...this.map.values()]);
  }
  keys(): Promise<string[]> {
    return Promise.resolve([...this.map.keys()]);
  }
  get(key: string): Promise<StoredValue | undefined> {
    return Promise.resolve(this.map.get(key));
  }
  put(key: string, value: StoredValue): Promise<void> {
    this.map.set(key, value);
    return Promise.resolve();
  }
  remove(key: string): Promise<void> {
    this.map.delete(key);
    return Promise.resolve();
  }
  clear(): Promise<void> {
    this.map.clear();
    return Promise.resolve();
  }
}

let singleton: KeyValueStore | null = null;

/** Shared store instance; memory-backed outside browsers. */
export function getBoardStore(): KeyValueStore {
  if (!singleton) {
    singleton = indexedDBAvailable() ? new IndexedDBStore() : new MemoryStore();
  }
  return singleton;
}

/** Test seam: replace the singleton (e.g. with a fresh MemoryStore). */
export function __setBoardStoreForTests(store: KeyValueStore | null): void {
  singleton = store;
}

export { MemoryStore };
