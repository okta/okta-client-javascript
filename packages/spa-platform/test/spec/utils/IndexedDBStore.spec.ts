import 'fake-indexeddb/auto';
import { IndexedDBStore } from 'src/utils/IndexedDBStore';

function deleteDatabase (name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();   // best-effort cleanup between tests
  });
}

function openRawConnection (name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function sleep (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('IndexedDBStore', () => {

  // every test starts from a fresh (nonexistent) database, so each one exercises
  // `keyStore()`'s "create from scratch" path rather than reusing state from a prior test
  afterEach(async () => {
    await deleteDatabase('AuthFoundation');
  });

  it('adds, gets, removes, and clears items', async () => {
    const store = new IndexedDBStore<{ value: string }>('DPoPKeys');

    expect(await store.get('foo')).toBe(null);

    await store.add('foo', { value: 'bar' });
    expect(await store.get('foo')).toEqual({ value: 'bar' });

    await store.remove('foo');
    expect(await store.get('foo')).toBe(null);

    await store.add('foo', { value: 'bar' });
    await store.add('baz', { value: 'qux' });
    await store.clear();
    expect(await store.get('foo')).toBe(null);
    expect(await store.get('baz')).toBe(null);
  });

  it('returns null for a missing id', async () => {
    const store = new IndexedDBStore('DPoPKeys');
    expect(await store.get('does-not-exist')).toBe(null);
  });

  it('returns null for an empty id without touching storage', async () => {
    const store = new IndexedDBStore('DPoPKeys');
    expect(await store.get('')).toBe(null);
  });

  it('self-heals via the version-upgrade path when the object store does not yet exist', async () => {
    // the very first `indexedDB.open()` call (no version specified) creates the database at
    // version 1 with only the legacy 'DPoPKeys' store (see the `onupgradeneeded` backwards-compat
    // branch) — requesting any *other* store name forces the version-bump/self-heal branch
    const store = new IndexedDBStore<{ value: string }>('SomeOtherStore');

    await store.add('foo', { value: 'bar' });
    expect(await store.get('foo')).toEqual({ value: 'bar' });
  });

  it('rejects (rather than hanging) when a transaction aborts', async () => {
    const store = new IndexedDBStore<{ value: string }>('DPoPKeys');

    await store.add('foo', { value: 'bar' });

    // `IDBObjectStore.add` throws `ConstraintError` on a duplicate key — the request error is
    // never handled with `preventDefault()`, so the transaction auto-aborts; this should reject
    // via the transaction's `abort` event rather than hang forever
    await expect(store.add('foo', { value: 'baz' })).rejects.toBeInstanceOf(DOMException);
  });

  describe('version-upgrade blocked by another connection', () => {
    const originalTimeoutMs = IndexedDBStore.upgradeBlockedTimeoutMs;
    let blockingConnection: IDBDatabase | undefined;

    beforeEach(async () => {
      // ensure the database exists at version 1 (with the default 'DPoPKeys' store) before
      // opening a second, deliberately-unclosed connection — this connection (with no
      // `onversionchange` handler to close itself) is what causes the version bump below to block
      await new IndexedDBStore('DPoPKeys').get('warmup');
      blockingConnection = await openRawConnection('AuthFoundation');
    });

    afterEach(() => {
      IndexedDBStore.upgradeBlockedTimeoutMs = originalTimeoutMs;
      blockingConnection?.close();   // release so the outer `afterEach`'s deleteDatabase can run cleanly
    });

    it('still resolves if the blocking connection closes before the timeout elapses', async () => {
      IndexedDBStore.upgradeBlockedTimeoutMs = 200;

      const store = new IndexedDBStore<{ value: string }>('BlockedStore');
      const promise = store.add('foo', { value: 'bar' });

      // give the upgrade request a moment to report blocked, then release well before the timeout
      await sleep(20);
      blockingConnection?.close();

      await expect(promise).resolves.toBeUndefined();
      expect(await store.get('foo')).toEqual({ value: 'bar' });
    });

    it('rejects once the timeout elapses without the blocking connection closing', async () => {
      IndexedDBStore.upgradeBlockedTimeoutMs = 50;

      const store = new IndexedDBStore('AnotherBlockedStore');

      await expect(store.add('foo', { value: 'bar' })).rejects.toThrow(/blocked by another open connection/);
    });
  });

});
