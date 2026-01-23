import {
  OAuth2ErrorResponse,
  isOAuth2ErrorResponse,
  hasSameValues,
  AcrValues
} from '@okta/auth-foundation';
import { Credential, Token, HostOrchestrator } from '@okta/spa-platform';
import { signIn, signOutFlow, getMordorToken, handleStepUp } from './auth.js';


const ADMIN_SPA_BROKER_TOKEN_TAG = 'admin-spa:broker-token';
const TOKEN_REQUEST_LOCK_TIMEOUT = 5000;

type BrokerAuthParams = {
  scopes: string[];
  acrValues?: AcrValues;
  maxAge?: number;
}

function isRTExpiredError ({ error, error_description }: OAuth2ErrorResponse): boolean {
  return (
    error === 'invalid_grant' && error_description === 'The refresh token is invalid or expired.'
  );
}

class TokenBroker extends HostOrchestrator.Host {
  tokenGracePeriod: number = 30;

  constructor (protected readonly name: string, options: HostOrchestrator.HostOptions = {}) {
    super(name, options);

    signOutFlow.on('flow_started', () => {
      this.close();
    });
  }

  async storageLookup ({ scopes, acrValues }: BrokerAuthParams): Promise<Token | undefined> {
    // TODO: confirm token matching
    const matches = await Credential.find(meta =>
      hasSameValues(scopes, meta.scopes) &&
      meta.tags.includes(ADMIN_SPA_BROKER_TOKEN_TAG)
    );

    for (const match of matches) {
      if (acrValues && acrValues !== match.token.context.acrValues) {
        continue;
      }

      if (match.token.willBeValidIn(this.tokenGracePeriod)) {
        return match.token;
      }
      else if (match.token.isExpired) {
        match.remove();   // remove expired tokens from storage
      }
    }
  }

  // uses a web lock to avoid simultaneous token requests using the same refresh
  async requestAccessToken (id: string, { scopes, acrValues }: BrokerAuthParams): Promise<Token | OAuth2ErrorResponse | null> {

    let timeoutId;
    const controller = new AbortController();
    try {
      const result = await navigator.locks.request(`admin-broker:${id}`, { signal: controller.signal }, async () => {
        timeoutId = setTimeout(controller.abort, TOKEN_REQUEST_LOCK_TIMEOUT);   // timeout so lock isn't held forever

        // perform lookup once lock is freed, request could have been fulfilled by previous lock holder
        const result = await this.storageLookup({ scopes, acrValues });
        if (result) {
          return result;
        }

        // physical refresh token may have rotated while awaiting lock
        const refreshToken = await getMordorToken();
        if (!refreshToken || !refreshToken.token.refreshToken) {
          return null;
        }

        // attempt refresh request
        const token = await refreshToken.oauth2.refresh(refreshToken.token, scopes);
        if (isOAuth2ErrorResponse(token)) {
          return token;
        }

        // if successful, write token to storage
        await Credential.store(token, [ADMIN_SPA_BROKER_TOKEN_TAG]);
        return token;
      }) as Promise<Token | OAuth2ErrorResponse | null>;

      return result;
    }
    catch (err) {
      console.log('Error requesting token', err);

      // return aborts (aka timeouts) as null to trigger AS redirect
      if (err instanceof DOMException && err.name === 'AbortError') {
        return null;
      }

      throw err;
    }
    finally {
      clearTimeout(timeoutId);
    }
  }

  // TODO: add allow/deny lists of scopes
  async findToken ({ scopes, acrValues, maxAge }: BrokerAuthParams): Promise<Token | OAuth2ErrorResponse> {
    let refreshToken: Credential | null = null;

    // 0 - A `maxAge` is specified, this indicates re-prompt is required
    if (maxAge) {
      // NOTE: 
      // Per spec, when higher assurance is required (`acr_values`) a `max_age` will also be provided by the Resource Server
      // therefore we are not handling scenarios where only one of `acrValues` or `maxAge` is provided

      // `handleStepUp` clears existing tokens
      refreshToken = await handleStepUp(maxAge, acrValues);
    }
    else {
      // 1 - check storage for a existing token that matches the required scopes
      const storedToken = await this.storageLookup({ scopes, acrValues });
      if (storedToken) {
        return storedToken;
      }

      // 2 - No matching/valid tokens found, token request is now required

      // verify the "mordor" token is available
      refreshToken = await getMordorToken();
      if (!refreshToken) {
        await signIn();   // will trigger redirect to AS (this promise never resolves)
        return { error: 'failed to authenticate' };  // should never reached
      }
    }

    // attempt a downscope refresh request
    const result = await this.requestAccessToken(refreshToken.id, { scopes, acrValues });
    if (!result) {
      await signIn();   // will trigger redirect to AS (this promise never resolves)
      return { error: 'failed to authenticate' };  // should never reached
    }

    if (isOAuth2ErrorResponse(result)) {
      const error: OAuth2ErrorResponse = result;
      if (isRTExpiredError(error)) {
        await signIn();   // will trigger redirect to AS (this promise never resolves)
      }

      // TODO: how do we handle oauth errors?
      return error;
    }

    return result;
  }
}

export const broker = new TokenBroker('AdminSpaBroker', { allowedOrigins: ['http://app.localhost:8080'] });
