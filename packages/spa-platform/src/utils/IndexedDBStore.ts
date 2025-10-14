/**
 * @packageDocumentation
 * @internal
 */

type StoreMethod = 'get' | 'add' | 'delete' | 'clear';

/** @internal */
function isIDBUnknownObjectStoreError (err: unknown, storeName: string) {
  if (err instanceof DOMException) {
    if (err.message === `IDBDatabase.transaction: '${storeName}' is not a known object store name`) {
      return true;
    }

    if (err.message === `Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.`) {
      return true;
    }
  }

  return false;
}


/**
 * Lightweight wrapper around IndexedDB ObjectStore instances
 * 
 * @internal
 */
export class IndexedDBStore<T> {
  private readonly dbName: string = 'AuthFoundation';

  constructor (
    private readonly storeName: string
  ) {}

  // convenience abstraction for exposing IDBObjectStore instance
  private keyStore (): Promise<IDBObjectStore> {
    const dbName = this.dbName;
    const storeName = this.storeName;

    return new Promise((resolve, reject) => {
      try {
        const indexedDB = window.indexedDB;
        // do not specify db version, so current version will be connected to
        const req = indexedDB.open(this.dbName);

        // TODO: [OKTA-977044] remove
        req.onupgradeneeded = function () {
          // required for backwards compat, ensures when db is created from scratch it contains the DPoP store
          req.result.createObjectStore('DPoPKeys');
        };

        req.onerror = function () {
          reject(req.error!);
        };

        req.onsuccess = function () {
          try {
            const db = req.result;
            const tx = db.transaction(storeName, 'readwrite');

            tx.onerror = function () {
              reject(tx.error!);
            };

            tx.oncomplete = function () {
              db.close();
            };

            const store = tx.objectStore(storeName);
            resolve(store);
          }
          catch (err) {
            // if ObjectStore does not exist in DB Version, upgrade DB to include version
            if (isIDBUnknownObjectStoreError(err, storeName)) {
              req.result.close();   // close current db connection

              // increment db version
              const upgradeReq = indexedDB.open(dbName, req.result.version + 1);
              upgradeReq.onupgradeneeded = function () {
                // create new ObjectStore
                upgradeReq.result.createObjectStore(storeName);
              };

              upgradeReq.onsuccess = function () {
                const db = upgradeReq.result;
                const upgradeTx = db.transaction(storeName, 'readwrite');

                upgradeTx.oncomplete = function () {
                  db.close();
                };

                // store won't be created until a transaction attempts to use it
                const store = upgradeTx.objectStore(storeName);
                resolve(store);
              };
            }
            else {
              reject(err);
            }
          }
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

  public async get (id: string): Promise<T | null> {
    if (id) {
      const req = await this.invokeStoreMethod('get', id);
      if (req.result) {
        return req.result;
      }
    }

    return null;
  }

  public async add (id: string, item: T): Promise<void> {
    await this.invokeStoreMethod('add', item, id);
  }

  public async remove (id: string): Promise<void> {
    await this.invokeStoreMethod('delete', id);
  }

  public async clear (): Promise<void> {
    await this.invokeStoreMethod('clear');
  }

}
