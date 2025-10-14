import { Strategy} from 'passport';
import { AuthorizationCodeFlow, SessionLogoutFlow, AuthTransaction } from '@okta/oauth2-flows';


const authParams = {
  baseURL: process.env.ISSUER,
  clientId: process.env.NODE_CLIENT_ID,
  scopes: ['openid', 'email', 'profile', 'offline_access'],
};

export class OIDCStrategy extends Strategy {
  constructor (options, verify) {
    super(options, verify);
    this.name = 'oidc';
    this._verify = verify;
  }

  currentUrl (req) {
    return new URL(`${req.protocol}://${req.host}${req.originalUrl ?? req.url}`);
  }

  async authenticate (req) {
    const flow = new AuthorizationCodeFlow({
      ...authParams,
      redirectUri: 'http://localhost:8080/login/callback'
    });

    if (req.query && req.query.code) {
      const currentUrl = this.currentUrl(req);

      try {
        const { token, context } = await flow.resume(currentUrl.href);

        const verified = (err, user, info) => {
          if (err) {
            return this.error(err);
          }
          if (!user) {
            return this.fail(info);
          }

          info ??= {};
          info.state = context.state;
          this.success(user, info);
        };

        this._verify(token, verified);
      }
      catch (err) {
        return this.error(err);
      }
    }
    else {
      const authorizeUrl = await flow.start();

      const transaction = new AuthTransaction(flow.context);
      await transaction.save();
  
      this.redirect(authorizeUrl, 302);
    }
  }

  static async logout (idToken) {
    const flow = new SessionLogoutFlow({
      ...authParams,
      logoutRedirectUri: 'http://localhost:8080/'
    });

    return await flow.start(idToken);
  }
}
