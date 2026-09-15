/**
 * @packageDocumentation
 * @internal
 */

type StoreMethod = 'get' | 'add' | 'delete' | 'clear';

/** @internal */
function isIDBUnknownObjectStoreError (err: unknown, storeName: string) {
  if (err instanceof DOMException) {
    // per spec, `IDBDatabase.transaction()` always throws `NotFoundError` when a named object
    // store doesn't exist — check this first since UA-specific `message` wording varies (and can
    // differ again in test environments/polyfills), while `name` is standardized
    if (err.name === 'NotFoundError') {
      return true;
    }

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
 * @internal
 * Closes `db` once `tx` settles, whether it commits or aborts — an aborted transaction
 * that's never closed leaks the connection and can block a later version upgrade.
 */
function attachTransactionLifecycle (db: IDBDatabase, tx: IDBTransaction): void {
  tx.addEventListener('complete', () => db.close(), { once: true });
  tx.addEventListener('abort', () => db.close(), { once: true });
}


/**
 * Lightweight wrapper around IndexedDB ObjectStore instances
 *
 * @internal
 */
export class IndexedDBStore<T> {
  // `onblocked` isn't itself a failure (see `keyStore()`) — this only bounds how long to wait
  // for it to resolve on its own before treating it as one. Mutable static so tests can shrink it.
  static upgradeBlockedTimeoutMs = 2000;

  private readonly dbName: string = 'AuthFoundation';

  constructor (
    private readonly storeName: string
  ) {}

  // convenience abstraction for exposing IDBObjectStore instance
  private keyStore (): Promise<{ store: IDBObjectStore, tx: IDBTransaction }> {
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

            attachTransactionLifecycle(db, tx);

            const store = tx.objectStore(storeName);
            resolve({ store, tx });
          }
          catch (err) {
            // if ObjectStore does not exist in DB Version, upgrade DB to include version
            if (isIDBUnknownObjectStoreError(err, storeName)) {
              req.result.close();   // close current db connection

              // increment db version
              const upgradeReq = indexedDB.open(dbName, req.result.version + 1);
              let blockedTimeoutId: ReturnType<typeof setTimeout> | undefined;

              upgradeReq.onupgradeneeded = function () {
                clearTimeout(blockedTimeoutId);
                // create new ObjectStore
                upgradeReq.result.createObjectStore(storeName);
              };

              upgradeReq.onerror = function () {
                clearTimeout(blockedTimeoutId);
                reject(upgradeReq.error!);
              };

              upgradeReq.onblocked = function () {
                // another tab holds an open connection to an earlier version, blocking this upgrade.
                // this isn't itself a failure — `upgradeReq` is still pending and will still fire
                // `onupgradeneeded`/`onsuccess` once that connection closes, so only give up if it's
                // still blocked after a short wait (every connection opened by this class is used for
                // one transaction and closed immediately, so blocking is expected to clear almost
                // instantly under normal conditions)
                blockedTimeoutId = setTimeout(() => {
                  reject(new Error(`IndexedDB upgrade of '${dbName}' blocked by another open connection`));
                }, IndexedDBStore.upgradeBlockedTimeoutMs);
              };

              upgradeReq.onsuccess = function () {
                clearTimeout(blockedTimeoutId);

                const db = upgradeReq.result;
                const upgradeTx = db.transaction(storeName, 'readwrite');

                attachTransactionLifecycle(db, upgradeTx);

                // store won't be created until a transaction attempts to use it
                const store = upgradeTx.objectStore(storeName);
                resolve({ store, tx: upgradeTx });
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
  // each call opens (and awaits the full lifecycle of) its own dedicated transaction —
  // requests are never shared across separate get/add/remove/clear calls
  private async invokeStoreMethod (method: StoreMethod, ...args: any[]): Promise<IDBRequest> {
    const { store, tx } = await this.keyStore();
    return new Promise((resolve, reject) => {
      // https://github.com/microsoft/TypeScript/issues/49700
      // https://github.com/microsoft/TypeScript/issues/49802
      // @ts-expect-error ts(2556)
      const req = store[method](...args);

      // resolve only once the transaction durably commits, not merely once the request succeeds —
      // and reject on abort (covers a request error, a commit-time failure like QuotaExceededError,
      // or an explicit tx.abort()) so this promise can never hang
      tx.addEventListener('complete', () => resolve(req), { once: true });
      tx.addEventListener('abort', () => reject(tx.error ?? req.error), { once: true });
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
