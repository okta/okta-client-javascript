/* eslint-disable @typescript-eslint/no-unused-vars */

import { Token } from 'src/Token';
import { OAuth2Client } from 'src/oauth2/client';
import { Credential } from 'src/Credential';
import { mockIDToken, mockTokenResponse } from '@repo/jest-helpers/browser/helpers';

class JestOAuth2Client extends OAuth2Client {
  public fetch (url: string | URL, options: RequestInit = {}): Promise<Response> {
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

export const makeRawTestToken = (id?, overrides: Record<string, any> = {}) => {
  const context: Token.Context = {
    issuer: client.configuration.baseURL.href,
    clientId: client.configuration.clientId,
    scopes: overrides?.scopes ?? client.configuration.scopes,
  };
  return {...mockTokenResponse(id, overrides), context};
};

export const makeTestToken = (id?, overrides = {}) => {
  const resp = makeRawTestToken(id, overrides);
  return new Token(resp);
};

export const makeTestCredential = () => {
  const token = makeTestToken();
  return new Credential(token, client);
};
