import { shortID, Token, TokenJSON } from '@okta/auth-foundation';
// import { AuthorizationCodeFlow } from '@okta/spa-oauth2-flows';
import { CredentialOrchestrator } from '../CredentialOrchestrator';

// const HANDLE_SILENTLY = true;
// const PROMPT_REQUIRED = 'PROMPT_REQUIRED';

// SubAppOrchestratorError
/**
 * @internal
 */
export class SAOError extends Error {}

// TODO: doc this?
/**
 * @internal
 */
export class SubAppOrchestrator extends CredentialOrchestrator {
  private readonly id: string = shortID();
  // private readonly channel: BroadcastChannel = new BroadcastChannel('SubAppOrchestrator');

  private pending: BroadcastChannel | null = null;

  constructor () {
    super();
  }

  private async broadcast (eventName, data): Promise<Record<string, unknown>> {
    const requestId = shortID();
    const channel = new BroadcastChannel('SubAppOrchestrator');
    
    console.log('broadcast1');
    return new Promise((resolve) => {
      const responseChannel = new BroadcastChannel(requestId);
      responseChannel.onmessage = (event) => {
        const { data } = event;
        console.log('onmessage', event);
        resolve(data);
        responseChannel.close();
      };

      console.log('broadcast2');
      // this.channel.postMessage({
      channel.postMessage({
        eventName,
        requestId,
        envId: 'bar',
        data,
        rand: Math.random()
      });
      channel.close();
    });
  }

  // public close () {
  //   return this.channel.close();
  // }

  private async requestToken (options: CredentialOrchestrator.AuthOptions) {
    console.log('request for token');
    // TODO: add timeout mechcanism
    const data = await this.broadcast('REQUEST', options);
    console.log('sub app received: ', data);

    if (data.token) {
      return new Token(data.token as TokenJSON);
    }

    if (data.error) {
      throw new SAOError(data.error as string);
    }

    throw new SAOError('Something went wrong');
  }

  public async getToken (options: CredentialOrchestrator.AuthOptions): Promise<Token | null> {
    const token = await this.requestToken(options);
    return token;
  }

  // TODO: implement
  private async requestDPoPSignature (request: Request): Promise<Request> {
    return request;
  }

  // TODO: implement
  public getDPoPSignature (options: CredentialOrchestrator.DPoPOptions): Promise<Request> {
    const { issuer, clientId, scopes, url, ...fetchInit } = options;
    const request = new Request(url, fetchInit);
    return this.requestDPoPSignature(request);
  }
}

/**
 * @internal
 */
// export function orchestratorAdaptor (orchestrator: CredentialOrchestrator) {
//   // TODO:
// }
