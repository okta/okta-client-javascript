import { type OAuth2ErrorResponse, getSearchParam } from '@okta/auth-foundation/core';
import { AuthenticationFlowError } from '../AuthenticationFlow.ts';

export type OAuth2CodeResponse = {
  code: string;
  state: string;
}

export function parseOAuth2Callback (url: URL | URLSearchParams): OAuth2CodeResponse | OAuth2ErrorResponse {
  const params = url instanceof URL ? url.searchParams : url;

  const error = getSearchParam(params, 'error');
  if (error) {
    return {
      error,
      errorDescription: getSearchParam(params, 'error_description'),
      errorUri: getSearchParam(params, 'error_uri'),
    };
  }

  const code = getSearchParam(params, 'code');
  const state = getSearchParam(params, 'state');

  if (!code) {
    throw new AuthenticationFlowError('Failed to parse `code` from redirect url');
  }
  if (!state) {
    throw new AuthenticationFlowError('Failed to parse `state` from redirect url');
  }

  return { code, state };
}
