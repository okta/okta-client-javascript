/* eslint-disable @typescript-eslint/no-unused-vars */

import { Token, OAuth2Client } from 'src/platform';
import { Credential } from 'src/Credential';
import { mockIDToken, mockTokenResponse } from '@repo/jest-helpers/browser/helpers';

class JestOAuth2Client extends OAuth2Client {
  public async fetch (url: string | URL, options: RequestInit = {}): Promise<Response> {
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

export class MockIndexedDBStore<T> {
  cache = new Map<string, T>();

  constructor (
    private readonly storeName: string = 'foo'
  ) {}

  public async get (id: string): Promise<T | null> {
    return this.cache.get(id) ?? null;
  }

  public async add (id: string, item: T): Promise<void> {
    this.cache.set(id, item);
  }

  public async remove (id: string): Promise<void> {
    this.cache.delete(id);
  }

  public async clear (): Promise<void> {
    this.cache.clear();
  }
}
