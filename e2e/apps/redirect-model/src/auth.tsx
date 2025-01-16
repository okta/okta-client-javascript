import { Credential } from '@okta/spa-platform';
import { clearDPoPKeyPairs } from '@okta/auth-foundation';
import { AuthorizationCodeFlow, SessionLogoutFlow } from '@okta/spa-oauth2-flows';
import { AuthorizationCodeFlowOrchestrator } from '@okta/spa-platform/orchestrator';

const USE_DPOP = __USE_DPOP__ === "true";

const isOIDC = (new URL(window.location.href).searchParams.get('oidc') !== "false");

const customScopes = [];
// const customScopes = [];

export const oauthConfig = {
  issuer: __ISSUER__,
  clientId: USE_DPOP ? __DPOP_CLIENT_ID__ : __SPA_CLIENT_ID__,
  scopes: [...(isOIDC ? ['openid', 'profile', 'email'] : []), 'offline_access', ...customScopes],
  dpop: USE_DPOP
};

export const signInFlow = new AuthorizationCodeFlow({
  ...oauthConfig,
  redirectUri: `${window.location.origin}/login/callback`,
});

const flowLogin = async (originalUri = window.location.href, meta = {}) => {
  const url = new URL(originalUri);
  if (url.origin !== window.location.origin) {
    throw new Error('mismatched domains');
  }
  await signInFlow.start({ originalUri: url.pathname, ...meta });
  return AuthorizationCodeFlow.PerformRedirect(signInFlow);
};

let _signIn: Promise<any> | null;
export const signIn = (originalUri?, meta?) => {
  if (!_signIn) {
    // this promise does not resolve
    _signIn = flowLogin(originalUri, meta);
  }

  return _signIn;
};

export const signOutFlow = new SessionLogoutFlow({
  ...oauthConfig,
  logoutRedirectUri: `${window.location.origin}/logout`
});

export const signOut = async () => {
  console.log('signOut called');
  const revocations: Promise<any>[] = [];

  const activeCreds = Credential.find(() => true);
  activeCreds.forEach(cred => {
    if (cred.id !== Credential.default?.id) {
      console.log('revoking credential: ', cred.id);
      revocations.push(cred.revoke());
    }
  });

  if (USE_DPOP) {
    // await clearDPoPKeyPairs();
    revocations.push(clearDPoPKeyPairs());
  }

  // execute all revokes simultaneously
  await Promise.all(revocations);

  if (Credential.default) {
    const idToken = Credential.default?.token?.idToken?.rawValue;
    if (idToken) {
      // if `idToken` exists, execute a Logout flow
      console.log('starting logout flow', idToken);
      const logoutUrl = await signOutFlow.start(idToken);
      Credential.default.remove();    // will be revoked via logout call, only needs to be removed from storage
      window.location.assign(logoutUrl);
    }
    else {
      // otherwise revoke the default credential
      await Credential.default.revoke();
    }
  }
};

export const orchestrator = new AuthorizationCodeFlowOrchestrator(signInFlow, oauthConfig);
