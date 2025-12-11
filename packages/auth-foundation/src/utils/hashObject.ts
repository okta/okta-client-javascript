import { hash } from '../crypto/index.ts';

/**
 * @internal
 * Stringifies an object in a predictable manner, so that
 * { a: 1, b: 2 } and { b: 2, a: 1 } are guaranteed to result in the same string
 */
function stableStringify(obj: Record<string, any>): string {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj).sort()) {
    if (Array.isArray(obj[key])) {
      result[key] = obj[key].sort();
    }
    result[key] = obj[key];
  }
  return JSON.stringify(result);
}

/**
 * @internal
 * 
 * Hashes an object into a string to be used as a key within a map
 */
export async function hashObject (obj: object): Promise<string> {
  return hash(stableStringify(obj));
}
