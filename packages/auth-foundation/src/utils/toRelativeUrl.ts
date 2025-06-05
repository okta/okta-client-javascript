export function toRelativeUrl (url: string | URL): string {
  url = new URL(url);
  return url.href.replace(url.origin, '');
}
