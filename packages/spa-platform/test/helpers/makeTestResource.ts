/* eslint-disable @typescript-eslint/no-unused-vars */

import { Token } from '@okta/auth-foundation';
import OAuth2Client from '@okta/auth-foundation/client';
import { mockIDToken, mockTokenResponse } from '@repo/jest-helpers/browser/helpers';
import { Credential } from 'src/Credential';

class JestOAuth2Client extends OAuth2Client {
  protected internalFetch (url: string | URL, options: RequestInit = {}): Promise<Response> {
    throw new Error('JEST CLIENT BOUNDARY, NO NETWORK REQUEST SHOULD BE MADE!');
  }
}

export const client = new JestOAuth2Client({
  baseURL: 'https://foo.okta.com',
  clientId: 'fake',
  scopes: ['openid', 'email', 'profile', 'offline_access']
});

export const oauthClient = client;

export const makeTestIDToken = () => {
  return mockIDToken();
};

export const makeRawTestToken = (id?, overrides = {}) => {
  const context: Token.Context = {
    issuer: client.configuration.baseURL.href,
    clientId: client.configuration.clientId,
    scopes: client.configuration.scopes,
  };
  return {...mockTokenResponse(id, overrides), context};
};

export const makeTestToken = (id?, overrides = {}) => {
  return new Token(makeRawTestToken(id, overrides));
};

export const makeTestCredential = () => {
  const token = makeTestToken();
  return new Credential(token, client);
};
