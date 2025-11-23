/**
 * @module
 * @mergeModuleWith Networking
 */

/**
 * @group WWWAuthenticate
 */
export interface WWWAuthenticateError {
  readonly error: string;
  readonly errorDescription: string;
  // readonly realm?: string;
  readonly scheme: string;
  [key: string]: string;
}

/**
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
 * parses a www-authenticate header and builds an object representation of the error condition
 * 
 * @group WWWAuthenticate
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
 * Returns string value of a `www-authenticate` header
 *
 * @remarks
 * `HeadersInit` allows for a few different representations of headers with different access patterns (.get vs [key])
 * 
 * @group WWWAuthenticate
 */
export function getHeader (headers: HeadersInit): string | null {
  return (headers instanceof Headers ? headers : new Headers(headers)).get('www-authenticate');
}
