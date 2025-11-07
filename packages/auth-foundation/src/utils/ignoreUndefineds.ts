/**
 * @packageDocumentation
 * @internal
 */

/**
 * @internal
 * Removes `undefined` properties from an object (results in a new object)
 * 
 * @remarks
 * designed to be used in shallow spread operator merges, so undefined values don't override
 * already defined properties (aka doesn't set the value of a key to `undefined`)
 * 
 */
export function ignoreUndefineds<
  T extends Record<string | number, unknown> = Record<string | number, unknown>
>(target: T): T {
  const result = { ...target };
  for (const key in target) {
    if (target[key] === undefined) {
      delete result[key];
    }
  }

  return result;
}
