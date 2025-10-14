import { Credential, OAuth2Client, clearDPoPKeyPairs } from '@okta/spa-platform';
import { AuthorizationCodeFlow, SessionLogoutFlow } from '@okta/spa-platform/flows';
import { AcrValues, JsonRecord, isOAuth2ErrorResponse } from '@okta/auth-foundation';


const ADMIN_SPA_REFRESH_TOKEN_TAG = 'admin-spa:mordor-token';

// ############# OAuth Configuration ############# //
export const oauthScopes = ['openid', 'profile', 'email', 'offline_access'];

export const customScopes = [
  'test.scope.a',
  'test.scope.b',
  'test.scope.c',
];

export const oauthConfig: any = {
  issuer: customScopes?.length ? `${__ISSUER__}/oauth2/default` : __ISSUER__,
  clientId: __DPOP_CLIENT_ID__,
  scopes: [...oauthScopes, ...customScopes],
  dpop: true
};
oauthConfig.baseURL = oauthConfig.issuer;

export const client = new OAuth2Client(oauthConfig);


// ############# OAuth Flow Instances ############# //
export const signInFlow = new AuthorizationCodeFlow(client, {
  redirectUri: `${window.location.origin}/login/callback`,
});

export const signIn = async (originalUri: string = window.location.href, meta: JsonRecord = {}) => {
  const url = new URL(originalUri);
  if (url.origin !== window.location.origin) {
    throw new Error('mismatched domains');
  }

  await signInFlow.start({ originalUri: url.pathname + url.search, ...meta });
  return AuthorizationCodeFlow.PerformRedirect(signInFlow);
};

export async function handleAuthorizationCodeFlowResponse () {
  try {
    const { token, context } = await signInFlow.resume(window.location.href);

    const currentCredential = await getMordorToken();
    if (currentCredential) {
      await currentCredential.remove();
    }

    await Credential.store(token, [ADMIN_SPA_REFRESH_TOKEN_TAG]);

    return context.originalUri;
  }
  catch (err) {
    console.log(err);
    throw err;
  }
}

export async function handleAcrStepUp (acrValues: AcrValues, maxAge: number = 1) {
  // provide `acrValues` to request a token with a higher assurance level
  // provide `maxAge` to force a re-prompt
  await signInFlow.start({}, { acrValues, maxAge: maxAge });

  // request new mordor token with higher assurance level
  const result = await AuthorizationCodeFlow.PerformInPopup(signInFlow);

  if (!result.completed) {
    alert(`Failed to step up: ${result.reason}`);
    throw new Error('Test App Error: step up failed');
  }

  const { token } = result;

  // clear all existing tokens from storage (presumably they have been minted at the lower assurance level)
  await clearBrokerTokens();
  const mainCredential = await getMordorToken();
  await mainCredential?.remove();

  // store the new morder token
  return await Credential.store(token, [ADMIN_SPA_REFRESH_TOKEN_TAG]);
}

export const signOutFlow = new SessionLogoutFlow(client, {
  logoutRedirectUri: `${window.location.origin}/logout`
});

async function clearBrokerTokens () {
  const refreshId = (await getMordorToken())?.id;
  await Promise.all((await Credential.find(() => true)).map(async (credential) => {
    if (credential.id !== refreshId) {
      // if (credential.token.isExpired) {
      //   await credential.remove();
      // }
      // else {
      //   await credential.revoke();
      // }
      await credential.remove();  // revoke was causing 429 with too many test tokens
    }
  }));
}

export const signOut = async () => {
  console.log('signOut called');

  const mainCredential = await getMordorToken();

  await clearBrokerTokens();
  await clearDPoPKeyPairs();

  if (mainCredential) {
    const idToken = mainCredential?.token?.idToken?.rawValue;
    if (idToken) {
      // if `idToken` exists, execute a Logout flow
      console.log('starting logout flow', idToken);
      const logoutUrl = await signOutFlow.start(idToken);
      await mainCredential.remove();    // will be revoked via logout call, only needs to be removed from storage
      window.location.assign(logoutUrl);
    }
    else {
      // otherwise revoke the default credential
      await mainCredential.revoke();
    }
  }
};

// ############# App/Broker Token Methods ############# //

// the all-scoped token to rule them all
export async function getMordorToken (): Promise<Credential | null> {
  return (await Credential.find(meta => meta.tags.includes(ADMIN_SPA_REFRESH_TOKEN_TAG)))?.[0] ?? null;
}

export async function initAuth () {
  let authRequired = true;

  const mordorCredential = await getMordorToken();

  if (mordorCredential) {
    if (!mordorCredential.token.isExpired) {
      // token is valid, persumably just obtained, can skip introspect call
      // note: this is technically checking the validity of the access token
      // for a small bootstrap optimization to avoid unecessary introspect calls
      authRequired = false;
    }
    else {
      // introspect the refreshToken to determine if the token is still valid
      const introspection = await mordorCredential.introspect('refresh_token');
      if (isOAuth2ErrorResponse(introspection)) {
        authRequired = true;
      }
      else {
        authRequired = !introspection.active;
      }
    }
  }

  if (authRequired) {
    if (mordorCredential) {
      await mordorCredential.remove();
    }
    await signIn();
  }
}

// Just for testing
export async function TEST_revokeToken () {
  await (await getMordorToken())?.revoke('REFRESH');
  console.log('token revoked');
};

// Just for testing
// removes everything other than the main credential
export async function TEST_removeAccessTokens () {
  const refreshId = (await getMordorToken())?.id;
  await Promise.all((await Credential.find(() => true)).map(async (credential) => {
    if (credential.id !== refreshId) {
      await credential.remove();
    }
  }));
};
