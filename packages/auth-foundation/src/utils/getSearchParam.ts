// https://github.com/panva/oauth4webapi/blob/main/src/index.ts#L3890
export function getSearchParam(parameters: URLSearchParams, name: string): string | undefined {
  const { 0: value, length } = parameters.getAll(name);
  if (length > 1) {
    throw new Error(`"${name}" parameter must be provided only once`);    // TODO: error
  }
  return value;
}
