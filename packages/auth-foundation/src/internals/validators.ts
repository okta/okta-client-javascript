/**
 * @packageDocumentation
 * @internal
 */

// generic function argument or response validators

export function validateString (input: unknown): input is string {
  return typeof input === 'string' && input.length !== 0;
}

export function validateURL (input: unknown, allowHttp = false): boolean {
  if (!validateString(input)) {
    return false;
  }
  try {
    const url = new URL(input);
    if (allowHttp) {
      return url.protocol === 'https:' || url.protocol === 'http:';
    }
    return url.protocol === 'https:';
  }
  // eslint-disable-next-line no-empty
  catch (err) {}
  return false;
}
