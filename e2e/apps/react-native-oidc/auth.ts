import Constants from 'expo-constants';
import { OAuth2Client } from '@okta/auth-foundation/core';
import {AuthorizationCodeFlow, Credential } from '@okta/react-native-platform';


export const client = new OAuth2Client({
  baseURL: Constants?.expoConfig?.extra?.env.ISSUER,
  clientId: Constants?.expoConfig?.extra?.env.NATIVE_CLIENT_ID,
  scopes: ['openid', 'email', 'profile', 'offline_access'],
  dpop: false
});

export const flow = new AuthorizationCodeFlow(client, {
  redirectUri: Constants?.expoConfig?.extra?.env.NATIVE_REDIRECT_URI
});

export async function performSignIn () {
  const result = await AuthorizationCodeFlow.PerformBrowserSignIn(flow);
  if (result.completed) {
    const { token } = result;
    const credential = await Credential.store(token);
    return credential;
  }

  return null;
}

export async function performSignOut () {
  await (await Credential.getDefault())?.revoke();
}
