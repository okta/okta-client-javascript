export interface DPoPStorage {
  add (id: string, keyPair: CryptoKeyPair): Promise<void>
  get (id: string): Promise<CryptoKeyPair | null>;
  remove (id: string): Promise<void>;
  clear (): Promise<void>;
}

type StoreMethod = 'get' | 'add' | 'delete' | 'clear';

export class IndexedDBDPoPStore implements DPoPStorage {
  
  // TODO: make this configurable?? (not sure if they is necessary)
  static INDEXEDDB_NAME = 'AuthFoundation';
  static DB_KEY = 'DPoPKeys';

  // convenience abstraction for exposing IDBObjectStore instance
  private keyStore (): Promise<IDBObjectStore> {
    return new Promise((resolve, reject) => {
      try {
        const indexedDB = window.indexedDB;
        const req = indexedDB.open(IndexedDBDPoPStore.INDEXEDDB_NAME, 1);

        req.onerror = function () {
          reject(req.error!);
        };

        req.onupgradeneeded = function () {
          const db = req.result;
          db.createObjectStore(IndexedDBDPoPStore.DB_KEY);
        };

        req.onsuccess = function () {
          const db = req.result;
          const tx = db.transaction(IndexedDBDPoPStore.DB_KEY, 'readwrite');

          tx.onerror = function () {
            reject(tx.error!);
          };

          const store = tx.objectStore(IndexedDBDPoPStore.DB_KEY);

          resolve(store);

          tx.oncomplete = function () {
            db.close();
          };
        };
      }
      catch (err) {
        reject(err);
      }
    });
  }

  // convenience abstraction for wrapping IDBObjectStore methods in promises
  private async invokeStoreMethod (method: StoreMethod, ...args: any[]): Promise<IDBRequest> {
    const store = await this.keyStore();
    return new Promise((resolve, reject) => {
      // https://github.com/microsoft/TypeScript/issues/49700
      // https://github.com/microsoft/TypeScript/issues/49802
      // @ts-expect-error ts(2556)
      const req = store[method](...args);
      req.onsuccess = function () {
        resolve(req);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  public async get (id: string): Promise<CryptoKeyPair | null> {
    if (id) {
      const req = await this.invokeStoreMethod('get', id);
      if (req.result) {
        return req.result;
      }
    }

    return null;
  }

  public async add (id: string, keyPair: CryptoKeyPair): Promise<void> {
    await this.invokeStoreMethod('add', keyPair, id);
    // return keyPair;
  }

  public async remove (id: string): Promise<void> {
    await this.invokeStoreMethod('delete', id);
  }

  public async clear (): Promise<void> {
    await this.invokeStoreMethod('clear');
  }

}
