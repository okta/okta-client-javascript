import { fetch as expoFetch, FetchResponse } from 'expo/fetch';
import Constants from 'expo-constants';
import { OAuth2Client } from '@okta/auth-foundation/core';


export const client = new OAuth2Client({
  baseURL: Constants?.expoConfig?.extra?.env.ISSUER,
  clientId: Constants?.expoConfig?.extra?.env.NATIVE_CLIENT_ID,
  // TODO: skip OIDC to avoid PK import errors
  // scopes: ['openid', 'email', 'profile', 'offline_access'],
  scopes: ['offline_access'],
  dpop: false,
  fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
    // const { body, ...rest } = { body: undefined, ...init };
    // const request = input instanceof Request ? input : new Request(input, rest);
    const request = input instanceof Request ? input : new Request(input, init);
    console.log('request', request);
    console.log('url: ', request.url);
    console.log('bdoy: ', typeof request.body, request.body instanceof URLSearchParams);
    console.log('body', request.body)
    // const { url, body, method, headers } = request;
    const response = await fetch(request);
    console.log(response.body);
    return response;
  }
});
