import { Credential, OAuth2Client, clearDPoPKeyPairs } from '@okta/spa-platform';
import { AuthorizationCodeFlow, SessionLogoutFlow } from '@okta/spa-platform/flows';
import { AuthorizationCodeFlowOrchestrator } from '@okta/spa-platform/orchestrator';


const USE_DPOP = __USE_DPOP__ === "true";

const isOIDC = (new URL(window.location.href).searchParams.get('oidc') !== "false");

const customScopes = [];
// const customScopes = [];

export const oauthConfig: any = {
  issuer: __ISSUER__,
  clientId: USE_DPOP ? __DPOP_CLIENT_ID__ : __SPA_CLIENT_ID__,
  scopes: [...(isOIDC ? ['openid', 'profile', 'email'] : []), 'offline_access', ...customScopes],
  dpop: USE_DPOP
};
oauthConfig.baseURL = oauthConfig.issuer;

export const client = new OAuth2Client(oauthConfig);

export const signInFlow = new AuthorizationCodeFlow(client, {
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

export const signOutFlow = new SessionLogoutFlow(client, {
  logoutRedirectUri: `${window.location.origin}/logout`
});

export const signOut = async () => {
  const activeCreds = await Credential.find(() => true);
  const defaultCredential = await Credential.getDefault();

  const promises = activeCreds.map(cred => {
    if (cred.id !== defaultCredential?.id) {
      return cred.revoke();
    }
  });

  if (USE_DPOP) {
    // await clearDPoPKeyPairs();
    promises.push(clearDPoPKeyPairs());
  }

  // execute all revokes simultaneously
  await Promise.all(promises);

  if (defaultCredential) {
    const idToken = defaultCredential.token?.idToken?.rawValue;
    if (idToken) {
      // if `idToken` exists, execute a Logout flow
      const logoutUrl = await signOutFlow.start(idToken);
      await defaultCredential.remove();    // will be revoked via logout call, only needs to be removed from storage
      await SessionLogoutFlow.PerformPostRedirect(logoutUrl)
    }
    else {
      // otherwise revoke the default credential
      await defaultCredential.revoke();
    }
  }
};
