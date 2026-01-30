import { createPkcePair } from "./pkce";

export type BuildAuthorizeUrlOptions = {
  issuer: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];

  state?: string;
  nonce?: string;
  prompt?: string;
  loginHint?: string;

  sessionToken?: string;
};

function trimSlash(s: string) {
  return s.replace(/\/+$/, "");
}

export async function buildAuthorizeUrl(params: BuildAuthorizeUrlOptions) {
  const { codeVerifier, codeChallenge, codeChallengeMethod } =
    await createPkcePair();

  const authorizeEndpoint = `${trimSlash(params.issuer)}/v1/authorize`;

  const newParams = new URLSearchParams();

  newParams.set("client_id", params.clientId);
  newParams.set("redirect_uri", params.redirectUri);
  newParams.set("response_type", "code");
  newParams.set("scope", params.scopes.join(" "));
  newParams.set("code_challenge", codeChallenge);
  newParams.set("code_challenge_method", codeChallengeMethod);

  if (params.state) {
    newParams.set("state", params.state);
  }

  if (params.nonce) {
    newParams.set("nonce", params.nonce);
  }

  if (params.prompt) {
    newParams.set("prompt", params.prompt);
  }

  if (params.loginHint) {
    newParams.set("login_hint", params.loginHint);
  }

  if (params.sessionToken) {
    newParams.set("sessionTonken", params.sessionToken);
  }

  const url = `${authorizeEndpoint}?${newParams.toString()}`;

  return {
    url,
    codeVerifier,
    codeChallenge,
    codeChallengeMethod,
  };
}
