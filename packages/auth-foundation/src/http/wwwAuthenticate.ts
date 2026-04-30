/**
 * @module
 * @mergeModuleWith Networking
 */

/**
 * Object representiation of a parsed `www-authenticate` header
 * @group WWWAuthenticate
 * @see
 * * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/WWW-Authenticate | MDN}
 * * {@link https://datatracker.ietf.org/doc/html/rfc7235#section-4.1 | RFC 7235 - WWW-Authenticate}
 */
export interface WWWAuthenticateError {
  readonly error: string;
  readonly errorDescription: string;
  // readonly realm?: string;
  readonly scheme: string;
  [key: string]: string;
}

/**
 * Type predicate for {@link WWWAuthenticateError}
 * @group WWWAuthenticate
 */
export function isWWWAuthenticateError (input: unknown): input is WWWAuthenticateError {
  if (input && typeof input === 'object') {
    if ('error' in input && ('scheme' in input || 'realm' in input)) {
      return true;
    }
  }
  return false;
}

/**
 * Parses a `www-authenticate` header and returns an object representation of the error condition.
 * 
 * @group WWWAuthenticate
 * @see
 * * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/WWW-Authenticate | MDN}
 * * {@link https://datatracker.ietf.org/doc/html/rfc7235#section-4.1 | RFC 7235 - WWW-Authenticate}
 */
export function parse (header: string | Headers | Response): WWWAuthenticateError | null {
  if (header instanceof Headers) {
    header = header.get('www-authenticate') ?? '';
  }
  else if (header instanceof Response) {
    header = header.headers.get('www-authenticate') ?? '';
  }

  // header cannot be empty string
  if (!header) {
    return null;
  }

  // example string: Bearer error="invalid_token", error_description="The access token is invalid"
  // regex will match on `error="invalid_token", error_description="The access token is invalid"`
  // see unit test for more examples of possible www-authenticate values
  // eslint-disable-next-line max-len
  const regex = /(?:,|, )?([a-zA-Z0-9!#$%&'*+\-.^_`|~]+)=(?:"([a-zA-Z0-9!#$%&'*+\-.,^_`|~ /:]+)"|([a-zA-Z0-9!#$%&'*+\-.^_`|~/:]+))/g;
  const firstSpace = header.indexOf(' ');
  const scheme = header.slice(0, firstSpace);
  const remaining = header.slice(firstSpace + 1);
  const params: Record<string, string> = {};

  // Reference: foo="hello", bar="bye"
  // i=0, match=[foo="hello1", foo, hello]
  // i=1, match=[bar="bye", bar, bye]
  let match;
  while ((match = regex.exec(remaining)) !== null) {
    params[match[1]] = (match[2] ?? match[3]);
  }

  // eslint-disable-next-line camelcase
  const { error, error_description } = params;
  // eslint-disable-next-line camelcase
  return {...params, error, errorDescription: error_description, scheme: scheme ?? 'unknown' };
}

/**
 * Returns string value of a `www-authenticate` header.
 *
 * @remarks
 * `HeadersInit` allows for a few different representations of headers with different access patterns (.get vs [key])
 * 
 * @group WWWAuthenticate
 */
export function getHeader (headers: HeadersInit): string | null {
  return (headers instanceof Headers ? headers : new Headers(headers)).get('www-authenticate');
}
