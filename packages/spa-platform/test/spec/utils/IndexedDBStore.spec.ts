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

});
