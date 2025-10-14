/**
 * @packageDocumentation
 * @internal
 */

/** @internal */
export function isFirefox (): boolean {
  return navigator.userAgent.toLowerCase().includes('firefox');
}
