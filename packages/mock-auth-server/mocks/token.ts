import { JWT, shortID } from '@okta/auth-foundation';
import { buf, b64u } from '@okta/auth-foundation/internal';


export interface TokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

export type MockIDTokenParams = {
  issuer: string;
  clientId: string;
  scope: string;
  nonce: string;
  additionalClaims?: Record<string, string>;
};

export type SigningKey = {
  privateKey: CryptoKey;
  keyId: string;
};

export async function createTokenResponseMock (
  idParams: MockIDTokenParams,
  signingKey: SigningKey,
  isDPoP: boolean = false
): Promise<TokenResponse> {
  
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 3600; // 1 hour

  // Default claims for id_token
  const claims: Record<string, string | number > = {
    iss: idParams.issuer,
    sub: 'user123',
    aud: idParams.clientId,
    iat: now,
    exp: now + expiresIn,
    nonce: idParams.nonce,
    auth_time: now,
    ...(idParams.additionalClaims ?? {}),
  };

  // Create JWT header
  const header = {
    alg: 'RS256',
    kid: signingKey.keyId
  };

  const accessToken = Buffer.from(
    JSON.stringify({
      sub: claims.sub,
      iat: now,
      exp: now + expiresIn,
    })
  ).toString('base64');

  const intArr = new Uint8Array(await crypto.subtle.digest('SHA-256', buf(accessToken)));
  const atHash = b64u(intArr.slice(0, intArr.length / 2));
  claims.at_hash = atHash;

  const idToken = await JWT.write(header, claims, signingKey.privateKey);

  const response: TokenResponse = {
    access_token: accessToken,
    id_token: idToken,
    token_type: isDPoP ? 'DPoP' : 'Bearer',
    expires_in: expiresIn,
    scope: idParams.scope
  };

  if (idParams.scope.includes('offline_access')) {
    response.refresh_token = shortID();
  }

  return response;
}