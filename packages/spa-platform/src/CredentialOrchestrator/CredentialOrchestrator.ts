import { EventEmitter, Token } from '@okta/auth-foundation';


/**
 * @module CredentialOrchestrator
 */

/**
 * @abstract
 *
 * Defines how {@link Token}s are retrieved to be consumed within an application
 *
 * @see {@link FetchClient}
 */
export abstract class CredentialOrchestrator {
  private readonly emitter: EventEmitter = new EventEmitter();

  /**
   * binds event listeners to events throw by the {@link CredentialOrchestrator}
   */
  on (eventName: string, handler: (event: any) => void) {
    return this.emitter.on(eventName, handler);
  }

  off (eventName: string, handler: (event: any) => void) {
    return this.emitter.off(eventName, handler);
  }

  /**
   * @abstract
   * Retrieves a valid {@link Token} to be used within an application
   *
   */
  public abstract getToken (options: CredentialOrchestrator.AuthOptions): Promise<Token | null>;

  /**
   * @abstract
   * This method is used to generate a `DPoP Proof` for a `HTTP` request rather than simply returning
   * an `access token` (to be used as a `Bearer token`)
   *
   * @remarks
   * This method is only documented as `abstract`, but is not marked `abstract` in the type definition. 
   * Not all implementations of {@link CredentialOrchestrator} will required this method.
   *
   * @see
   * - Okta Documentation: {@link https://developer.okta.com/docs/guides/dpop/nonoktaresourceserver/main/ | DPoP}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getDPoPSignature (options: CredentialOrchestrator.DPoPOptions): Promise<Request> {
    throw new Error('Current Orchestrator does not support DPoP. Implement `getDPopSignature`');
  }
}

export namespace CredentialOrchestrator {
  export type AuthOptions = {
    issuer: string | URL;
    clientId: string;
    scopes: string[];
  };

  export type DPoPOptions = AuthOptions & RequestInit & { url: string | URL };
}
