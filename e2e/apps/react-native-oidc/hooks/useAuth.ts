import { useCallback } from "react";
import { useRouter, type Router } from "expo-router";
import { openAuthSessionAsync } from "expo-web-browser";
import {
  AuthorizationCodeFlow,
  SessionLogoutFlow,
  AuthTransaction,
} from "@okta/oauth2-flows";
import { Credential } from "@okta/auth-foundation";
import { client } from "@/auth";
import Constants from "expo-constants";

async function performSignIn() {
  try {
    console.log("here 1");
    const redirectUri = Constants?.expoConfig?.extra?.env.REDIRECT_URI;

    console.log("redirectUri", redirectUri);

    const flow = new AuthorizationCodeFlow(client, {
      redirectUri: redirectUri,
    });
    console.log("test here");

    // TODO: improve this pattern, too awkward
    // .save was migrated away from AuthCodeFlow
    const uri = await flow.start();
    console.log("here 2");
    console.log("authorize url", uri);

    // @ts-ignore
    const transaction = new AuthTransaction(flow.context);
    await transaction.save();
    const result = await openAuthSessionAsync(uri.href, redirectUri);
    console.log("result: ", result);
    // @ts-ignore
    const { token, context } = await flow.resume(result.url);
    console.log("token", token);
    console.log("context", context);
    Credential.store(token);
  } catch (err) {
    console.log("here 3");
    console.log(err, (err as Error)?.stack);
    throw err;
  }
}

// TODO: cannot use oidc logout as openid is not a request scope currently
async function performSignOut() {
  const isOIDC = client.configuration.scopes.includes("openid");

  if (isOIDC) {
    // TODO:
    throw new Error("Not implemented");
  } else {
    // TODO: /revoke fails due to same URLSearchParams issue
    await (await Credential.getDefault())?.revoke();
    // await (await Credential.getDefault())?.remove();
  }
}

export function useAuth() {
  const router = useRouter();

  const signIn = useCallback(
    async (redirectTo: Parameters<Router["navigate"]>[0]) => {
      Credential.clear();
      await performSignIn();
      router.navigate(redirectTo);
    },
    [router]
  );

  const signOut = useCallback(
    async (redirectTo: Parameters<Router["navigate"]>[0]) => {
      await performSignOut();
      router.navigate(redirectTo);
    },
    [router]
  );

  return { signIn, signOut };
}
