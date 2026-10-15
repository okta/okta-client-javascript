import type { Request, Response, RequestHandler } from 'express';
import { JWT, shortID } from '@okta/auth-foundation';
import type { AuthMode } from './types.ts';


const dpopNonceError =
  'DPoP error="use_dpop_nonce", error_description="Resource server requires nonce in DPoP proof"';

function validateAuthToken (token: string) {
  // TODO: truly evaluate the token provided
  return token.length > 10;
}

function validateDPoPNonce (req: Request, res: Response) {
  let hasNonce = false;
  try {
    const jwt = new JWT(req.headers.dpop as string);
    hasNonce = jwt.payload?.nonce !== undefined;
  }
  catch {
    // malformed DPoP proof - treat the same as a missing nonce
    hasNonce = false;
  }

  if (!hasNonce) {
    res.setHeader('dpop-nonce', shortID());
    res.setHeader('www-authenticate', dpopNonceError);
    res.statusCode = 401;
    res.end('Unauthorized');
  }

  return hasNonce;
}

export type TokenPresentMiddlewareOptions = {
  /**
   * When `true`, resource server will mock requiring an dpop-nonce, mimicking the behavior of dpop-protected resources
   */
  enableDPoPNonce?: boolean;
  /**
   * When `true`, resources can be requested without authentication by providing `?skip=1`. FOR TESTING LOCALLY ONLY.
   */
  allowSkipParam?: boolean;
};

/**
 * Allows either DPoP or Bearer tokens, does not conform to any true auth strategies. Just for testing apps.
 * Just confirms the `Authorization` header has a token-like value and will prompt for `dpop-nonce` retry when configured.
 */
function createTokenPresentMiddleware (options: TokenPresentMiddlewareOptions = { enableDPoPNonce: true }): RequestHandler {
  return (req, res, next) => {
    if (options.allowSkipParam === true && req.originalUrl?.endsWith('?skip=1')) {
      return next();
    }

    if (req.headers.dpop && options.enableDPoPNonce) {
      if (!validateDPoPNonce(req, res)) {
        return;
      }
    }

    const authHeader = req.headers.authorization;

    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');
      if ((scheme === 'DPoP' || scheme === 'Bearer') && token.length > 10) {
        return next();
      }
    }

    res.statusCode = 401;
    res.end('Unauthorized');
  };
}

export type DPoPMiddlewareOptions = {
  enableDPoPNonce?: boolean;
};

/**
 * TODO: not implemented yet
 * Should actually perform DPoP Proof verification + access token validiation
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createDPoPMiddleware (options: DPoPMiddlewareOptions = { enableDPoPNonce: true }): RequestHandler {
  return (req, res, next) => next();
}

export type BearerMiddlewareOptions = {};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createBearerMiddleware (options: BearerMiddlewareOptions = {}): RequestHandler {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const bearerToken = authHeader.replace('Bearer ', '');
      if (validateAuthToken(bearerToken)) {
        return next();
      }
    }

    res.statusCode = 401;
    res.end('Unauthorized');
  };
}

export type AuthMiddlewareOptions = 
  Partial<TokenPresentMiddlewareOptions> &
  Partial<DPoPMiddlewareOptions> &
  Partial<BearerMiddlewareOptions>;

export function createAuthMiddleware (mode: AuthMode, middlewareOptions: AuthMiddlewareOptions = {}): RequestHandler {
  switch (mode) {
    case 'token_present':
      // allows either DPoP or Bearer tokens, does not conform to any true auth strategies. Just for testing apps.
      return createTokenPresentMiddleware(middlewareOptions);
    case 'dpop':
      // TODO:
      return createDPoPMiddleware(middlewareOptions);
    case 'bearer':
      return createBearerMiddleware(middlewareOptions);
    case 'none':
      return (req, res, next) => next();
  }
}
