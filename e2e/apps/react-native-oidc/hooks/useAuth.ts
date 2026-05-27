import { useCallback } from 'react';
import { useRouter, type Router } from 'expo-router';
import { Platform } from 'react-native';
import { openAuthSessionAsync } from 'expo-web-browser';
// import { AuthorizationCodeFlow, SessionLogoutFlow, AuthTransaction } from '@okta/oauth2-flows';
// import { Credential } from '@okta/auth-foundation/core';
import {
  AuthorizationCodeFlow,
  SessionLogoutFlow,
  AuthTransaction,
  Credential
} from '@okta/react-native-platform';
import { client } from '@/auth';


async function performSignIn () {
  try {
    console.log('here 1')
    // Platform-specific redirect URI - iOS uses single slash, Android uses double slash
    const redirectUri = Platform.OS === 'ios'
      ? 'com.oktapreview.jperreault-test:/callback'
      : 'com.oktapreview.jperreault-test://callback';

    // TODO: move to env
    const flow = new AuthorizationCodeFlow(client, {
      redirectUri
    });

    console.log('here 1')
    const uri = await flow.start();

    // @ts-ignore
    const transaction = new AuthTransaction(flow.context);
    await transaction.save();
    const result = await openAuthSessionAsync(uri.href, redirectUri);
    console.log('result: ', result)
    // @ts-ignore
    const { token, context } = await flow.resume(result.url);
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
}

async function performSignOut () {
  const isOIDC = client.configuration.scopes.includes('openid');

  // TODO: implement oidc logout
  await (await Credential.getDefault())?.revoke();
}

export function useAuth () {
  const router = useRouter();

  const signIn = useCallback(async () => {
    const id = await performSignIn();
    return id;
  }, [router]);

  const signOut = useCallback(async (redirectTo: Parameters<Router['navigate']>[0]) => {
    await performSignOut();
    router.navigate(redirectTo);
  }, [router]);

  return { signIn, signOut };
};