// generic function argument or response validators

export function validateString(input: unknown): input is string {
  return typeof input === 'string' && input.length !== 0;
}

export function validateURL(input: unknown): boolean {
  if (!validateString(input)) {
    return false;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(input);
    return true;
  }
  // eslint-disable-next-line no-empty
  catch (err) {}
  return false;
}

// only returns false if `input` is an array AND is empty
export function validateArrayNotEmpty(input: unknown): boolean {
  return Array.isArray(input) ? input.length !== 0 : true;
}
