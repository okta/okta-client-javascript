/**
 * @module
 * @mergeModuleWith Core
 */


/**
 * Utility function to verify two arrays contain the same items
 * 
 * @remarks
 * Requires array contain unique items
 * 
 * @group Utils
 */
// confirms both arrays contains the same elements, regardless of order
// NOTE: THIS WILL NOT HANDLE cases like: [1,2,2] vs [1,1,2]
export function hasSameValues<T> (a1: T[], a2: T[], strict = true) {
  if (!Array.isArray(a1) || !Array.isArray(a2)) {return false;}
  const s1: Set<T> = new Set(a1);
  const s2: Set<T> = new Set(a2);
  const long = s1.size >= s2.size ? s1 : s2;
  const short = long === s1 ? s2 : s1;

  if (strict) {
    if (s1.size !== s2.size) {
      return false;
    }
  }

  return ([...short].every(t => long.has(t)));
}

/**
 * Utility function to verify an object contains specific key/value pairs
 * 
 * @group Utils
 */
export function doesPartialMatch (target: Record<string, unknown>, partial: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(partial)) {
    if (target[key] !== value) {
      return false;
    }
  }

  return true;
}
