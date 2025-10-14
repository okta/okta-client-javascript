/**
 * @module
 * @mergeModuleWith Core
 */


type MergeByIteratorTarget<K, V> = {
  has (key: K): boolean;
  set (key: K, value: V): void;
  delete (key: K): void;
}

// typescript made me do it
function mergeIntoByIterator<
  T extends MergeByIteratorTarget<K, V>,
  K extends string | number | symbol = string,
  V = string
>(
  transformer: (s: T | Record<K, V | undefined>) => IterableIterator<[K, V | undefined]> | [K, V | undefined][],
  target: T,
  ...source: (T | Record<K, V | undefined>)[]
): T {
  for (const src of source) {
    if (!src || typeof src !== 'object') {
      throw new TypeError('All arguments must be objects');
    }
    const iter = transformer(src);
    for (const [key, val] of iter) {
      if (val === undefined) {
        target.delete(key);
      }
      else if (target.has(key)) {
        throw new Error(`key (${String(key)}) collision while building headers`);
      }
      else {
        target.set(key, val);
      }
    }
  }
  return target;
}

/**
 * Merges `n` number of {@link !URLSearchParams} instances
 * 
 * @group Utils
 */
export function mergeURLSearchParameters(
  target: URLSearchParams,
  ...source: (URLSearchParams | Record<string, string | undefined>)[]
): URLSearchParams {
  const transformer = (src: URLSearchParams | Record<string, string | undefined>) => {
    return src instanceof URLSearchParams ? src.entries() : Object.entries(src);
  };

  return mergeIntoByIterator<URLSearchParams>(transformer, target, ...source);
}

/**
 * Merges `n` number of {@link !Headers} instances
 * 
 * @group Utils
 */
export function mergeHeaders (
  target: Headers,
  ...source: (Headers |  Record<string, string | undefined>)[]
): Headers {
  const transformer = (src: Headers | Record<string, string | undefined>) => {
    return src instanceof Headers ? src.entries() : Object.entries(src);
  };

  return mergeIntoByIterator<Headers>(transformer, target, ...source);
}
