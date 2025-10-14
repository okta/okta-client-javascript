import { MockLayer } from 'vite-plugin-mock-server';
import { JWT, shortID } from '@okta/auth-foundation';


const dpopNonceError = 
  'DPoP error="use_dpop_nonce", error_description="Resource server requires nonce in DPoP proof"';

const dpopNonce = shortID();

export const requireDPoPToken: MockLayer = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (req.headers.dpop) {
    const jwt = new JWT(req.headers.dpop as string);
  
    if (jwt.payload?.nonce === undefined) {
      res.setHeader('dpop-nonce', dpopNonce);
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
