import { Credential } from '@okta/spa-platform';
import OAuth2Client from '@okta/auth-foundation/client';
import { JsonRecord, clearDPoPKeyPairs, isOAuth2ErrorResponse } from '@okta/auth-foundation';
import { AuthorizationCodeFlow, SessionLogoutFlow } from '@okta/spa-oauth2-flows';


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

    const currentCredential = getMordorToken();
    if (currentCredential) {
      currentCredential.remove();
    }

    Credential.store(token, [ADMIN_SPA_REFRESH_TOKEN_TAG]);

    return context.originalUri;
  }
  catch (err) {
    console.log(err);
    alert((err as Error).message);
    throw err;
  }
}

export const signOutFlow = new SessionLogoutFlow(client, {
  logoutRedirectUri: `${window.location.origin}/logout`
});

export const signOut = async () => {
  console.log('signOut called');
  const revocations: Promise<any>[] = [];

  const mainCredential = getMordorToken();

  const activeCreds = Credential.find(() => true);
  activeCreds.forEach(cred => {
    if (cred.id !== mainCredential?.id) {
      // if (cred.token.isExpired) {
      //   cred.remove();
      // }
      // else {
      //   revocations.push(cred.revoke());
      // }
      cred.remove();  // revoke was causing 429 with too many test tokens
    }
  });

  revocations.push(clearDPoPKeyPairs());

  // execute all revokes simultaneously
  await Promise.all(revocations);

  if (mainCredential) {
    const idToken = mainCredential?.token?.idToken?.rawValue;
    if (idToken) {
      // if `idToken` exists, execute a Logout flow
      console.log('starting logout flow', idToken);
      const logoutUrl = await signOutFlow.start(idToken);
      mainCredential.remove();    // will be revoked via logout call, only needs to be removed from storage
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
export function getMordorToken (): Credential | null {
  return Credential.find(meta => meta.tags.includes(ADMIN_SPA_REFRESH_TOKEN_TAG))?.[0] ?? null;
}

export async function initAuth () {
  let authRequired = true;

  const mordorCredential = getMordorToken();

  if (mordorCredential) {
    if (!mordorCredential.token.isExpired) {
      // token is valid, persumably just obtained, can skip introspect call
      // note: this is technically checking the validity of the access token
      // for a small bootstrap optimization to avoid unecessary introspect calls
      authRequired = false;
    }
    else {
      // introspect the refreshToken to determine if the token is still valid
      const introspection = await client.introspect(mordorCredential.token, 'refresh_token');
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
      mordorCredential.remove();
    }
    await signIn();
  }
}

// Just for testing
export async function TEST_revokeToken () {
  await getMordorToken()?.revoke('REFRESH');
  console.log('token revoked');
};

// Just for testing
// removes everything other than the main credential
export async function TEST_removeAccessTokens () {
  const refreshId = getMordorToken()?.id;
  Credential.allIDs.map(id => {
    if (id !== refreshId) {
      Credential.with(id)?.remove();
    }
  });
};
