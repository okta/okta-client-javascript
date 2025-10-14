/**
 * @module
 * @mergeModuleWith Core
 */


/**
 * Utility function which converts a full URL to a relative path
 * 
 * @group Utils
 */
export function toRelativeUrl (url: string | URL): string {
  url = new URL(url);
  return url.href.replace(url.origin, '');
}
