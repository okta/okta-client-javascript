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
// NOTE: defining this method with a generic is very difficult in TS and not "worth"
// much more than casting the result anyway. Either way the caller needs to provide a type
export function ignoreUndefineds (target: Record<string | number, unknown>): typeof target {
  const result = {};
  for (const key in target) {
    if (target[key] !== undefined) {
      result[key] = target[key];
    }
  }

  return result;
}
