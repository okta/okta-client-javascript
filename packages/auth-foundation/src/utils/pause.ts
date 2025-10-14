/**
 * @module
 * @mergeModuleWith Core
 */


/**
 * Returns a {@link !Promise} which resolves after a short delay (milliseconds)
 * 
 * @remarks
 * Wraps {@link !setTimeout} in a {@link !Promise}
 * 
 * @param ms - length of delay in milliseconds
 * 
 * @group Utils
 */
export function pause (ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
