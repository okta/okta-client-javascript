// generic function argument or response validtiors

export function validateString(input: unknown): input is string {
  return typeof input === 'string' && input.length !== 0;
}

export function validateURL(input: unknown) {
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
