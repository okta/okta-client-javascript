// TODO: doc this

export interface WWWAuthenticateError {
  readonly error: string;
  readonly errorDescription: string;
  // readonly realm?: string;
  readonly scheme: string;
  [key: string]: string;
}

export function isWWWAuthenticateError (input: unknown): input is WWWAuthenticateError {
  if (input && typeof input === 'object') {
    const obj = input as Record<string, string>;
    if (obj.error && (obj.scheme || obj.realm)) {
      return true;
    }
  }
  return false;
}

// parses the www-authenticate header for releveant
export function parse (header: string): WWWAuthenticateError | null {
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

// finds the value of the `www-authenticate` header. HeadersInit allows for a few different
// representations of headers with different access patterns (.get vs [key])
export function getHeader (headers: HeadersInit): string | null {
  return (headers instanceof Headers ? headers : new Headers(headers)).get('www-authenticate');
}
