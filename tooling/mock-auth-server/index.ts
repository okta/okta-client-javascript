import express, { type Request, type Response }  from 'express';
import cors from 'cors';
import { shortID } from '@okta/auth-foundation';
import path from 'node:path';
import { generateKeyPair } from './crypto.ts';
import { createTokenResponseMock } from './mocks/token.ts';
import { requestLogger, errorLogger, logException } from './logger.ts';

process.on('uncaughtException', (err) => {
  logException(err);
});

const keyPair = await generateKeyPair();

const app = express();
app.use(requestLogger);
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true }));
app.use(cors());


function getHostUrl (req: Request) {
  return path.join(`${req.protocol}://${req.host}`, '/');
}

const pending: Record<string, any> = {};

// app.get('/create-flow', (req: Request, res: Response) => {
//   const params = req.query;


// });

const authServer = express.Router();

authServer.get('/.well-known/openid-configuration', (req: Request, res: Response) => {
  const baseUrl = getHostUrl(req);
  res.json({
    issuer: path.join(baseUrl, '/oauth2'),
    authorization_endpoint: path.join(baseUrl, '/oauth2/authorize'),
    token_endpoint: path.join(baseUrl, '/oauth2/token'),
    jwks_uri: path.join(baseUrl, '/oauth2/keys'),
    revocation_endpoint: path.join(baseUrl, '/oauth2/revoke'),
    id_token_signing_alg_values_supported: [ 'RS256' ]
  });
});

authServer.get('/authorize', (req: Request, res: Response) => {
  const { state, redirect_uri, client_id, scope, nonce } = req.query as Record<string, string>;
  if (!state || !redirect_uri) {
    return;
  }

  const code = shortID();

  pending[code] = {
    params: { code, state, redirect_uri, client_id, scope, nonce }
  };

  const url = new URL(redirect_uri);
  url.searchParams.append('state', state);
  url.searchParams.append('code', code);

  res.redirect(url.href);
});

authServer.get('/keys', (req: Request, res: Response) => {
  res.json({ keys: [ keyPair.publicKeyJWK ] });
});

authServer.post('/token', async (req: Request, res: Response) => {
  const { code, grant_type } = req.body;
  if (!code || !grant_type) {
    return;
  }

  if (grant_type === 'authorization_code') {
    const issuer = path.join(getHostUrl(req), '/oauth2');
    const transaction = pending[code];
    const { client_id, scope, nonce } = transaction.params;

    const response = await createTokenResponseMock(
      { issuer, clientId: client_id, scope, nonce },
      keyPair,
      !!req.header('dpop')
    );

    res.json(response);
  }
  else {
    console.warn('unknown grant_type');
  }
});

authServer.post('/revoke', (req: Request, res: Response) => {
  res.send(200);
});

app.use('/oauth2', authServer);

app.use(errorLogger);

app.listen(3030, (err) => {
  if (!err) {
    console.log('Started Mock OAuth2 Server');
  }
});
