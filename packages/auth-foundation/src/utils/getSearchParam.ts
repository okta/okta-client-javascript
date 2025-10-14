/**
 * @module
 * @mergeModuleWith Core
 */

import { NetworkError } from '../errors/index.ts';


/**
 * Extracts a query parameter from a {@link !URLSearchParams} instance. Throws when more than one value exists for given parameter
 * (which is allowed in the URI spec, but is not practiced in OAuth2)
 * 
 * @throws {@link NetworkError}
 * 
 * @group Utils
 */
export function getSearchParam(parameters: URLSearchParams, name: string): string | undefined {
  const { 0: value, length } = parameters.getAll(name);
  if (length > 1) {
    throw new NetworkError(`multiple values found for parameter "${name}"`);
  }
  return value;
}
