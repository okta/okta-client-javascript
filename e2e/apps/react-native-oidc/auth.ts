import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { OAuth2Client } from '@okta/auth-foundation/core';
import {
  AuthorizationCodeFlow,
  SessionLogoutFlow,
  AuthTransaction,
  Credential,
  openAuthSession
} from '@okta/react-native-platform';


export const client = new OAuth2Client({
  baseURL: Constants?.expoConfig?.extra?.env.ISSUER,
  clientId: Constants?.expoConfig?.extra?.env.NATIVE_CLIENT_ID,
  scopes: ['openid', 'email', 'profile', 'offline_access'],
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

export const flow = new AuthorizationCodeFlow(client, {
  redirectUri: Constants?.expoConfig?.extra?.env.NATIVE_REDIRECT_URI
});

export async function handleAuthFlowCallback (params: string | URLSearchParams) {
  try {
    const { token, context } = await flow.resume(params);
    console.log('token', token);
    console.log('context', context);
    const credential = await Credential.store(token);
    return credential.id;
  }
  catch (err) {
    console.log('here 3');
    console.log(err, (err as Error)?.stack);
    throw err;
  }
  finally {
    flow.reset();
  }
}

export async function performSignIn () {
  try {
    console.log('here 1')
    const uri = await flow.start();

    // @ts-ignore
    const transaction = new AuthTransaction(flow.context);
    await transaction.save();
    console.log('here 2.5 - transaction saved')
    const result = await openAuthSession(uri.href, flow.redirectUri);
    console.log('result: ', result)

    if (result.type === 'success') {
      if (['ios', 'macos'].includes(Platform.OS)) {
        return await handleAuthFlowCallback(result.url);
      }
    }

    // TODO: handle this
    console.log('[WARNING] auth did not complete')
  }
  catch (err) {
    console.log('here 3');
    console.log(err, (err as Error)?.stack);
    throw err;
  }
}

export async function performSignOut () {
  const isOIDC = client.configuration.scopes.includes('openid');

  // TODO: implement oidc logout
  await (await Credential.getDefault())?.revoke();
}
