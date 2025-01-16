import { MockLayer } from 'vite-plugin-mock-server';
import { webcrypto } from 'node:crypto';
import { JWT, shortID } from '@okta/auth-foundation';

// crypto "types" are incompatible. Probably just a typing issue, 
// not worth solving for a mock server. Required to be able to use the JWT class
// @ts-expect-error
global.crypto = webcrypto;

const dpopNonceError = 
  'DPoP error="use_dpop_nonce", error_description="Resource server requires nonce in DPoP proof"';

export const requireBearerToken: MockLayer = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (req.headers.dpop) {
    const jwt = new JWT(req.headers.dpop as string);
  
    if (jwt.payload?.nonce === undefined) {
      res.setHeader('dpop-nonce', shortID());
      res.setHeader('www-authenticate', dpopNonceError);
      res.statusCode = 401;
      res.end('Unauthorized');
      return;
    }
  }

  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    if ((scheme === 'DPoP' || scheme === 'Bearer') && token.length > 10) {
      return next();
    }
  }

  res.statusCode = 401;
  res.end('Unauthorized');
};
