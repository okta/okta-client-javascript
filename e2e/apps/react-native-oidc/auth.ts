import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { OAuth2Client } from '@okta/auth-foundation/core';
import {
  AuthorizationCodeFlow,
  SessionLogoutFlow,
  Credential,
} from '@okta/react-native-platform';


export const client = new OAuth2Client({
  baseURL: Constants?.expoConfig?.extra?.env.ISSUER,
  clientId: Constants?.expoConfig?.extra?.env.NATIVE_CLIENT_ID,
  scopes: ['openid', 'email', 'profile', 'offline_access'],
  dpop: false,
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


// // TODO: leaving for testing OIDC logout - remove before release
// AuthorizationCodeFlow.defaultBrowserSessionOptions.ephemeralSession = false;

// const signOutFlow = new SessionLogoutFlow(client, {
//   logoutRedirectUri: Constants?.expoConfig?.extra?.env.NATIVE_LOGOUT_REDIRECT_URI
// });

// export async function performSignOut () {
//   const isOIDC = client.configuration.scopes.includes('openid');
//   const defaultCredential = await Credential.getDefault();

//   console.log('here', isOIDC)
//   if (isOIDC) {
//     const idToken = defaultCredential?.token?.idToken;
//     console.log('here2', defaultCredential, idToken)
//     if (defaultCredential && idToken) {
//       const url = await signOutFlow.start(idToken.rawValue)
//       const result = await SessionLogoutFlow.PerformBrowserLogout(url);
//       console.log('here3', result);
//     }
//   }

//   await defaultCredential?.revoke();
// }
