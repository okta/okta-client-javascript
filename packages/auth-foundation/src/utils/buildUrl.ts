export function buildURL (base: URL, ...path: string[]): URL {
  if (!(base instanceof URL)) {
    throw new TypeError('"base" must be instance of URL');
  }

  const url = new URL(base.href);

  url.pathname = `${base.pathname}${path.join('/')}`.replace('//', '/');

  return url;
}
