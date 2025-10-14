/**
 * @module
 * @mergeModuleWith OAuth2
 */

import type { JsonPrimitive } from '../../types/index.ts';
import { Token } from '../../Token.ts';
import { OAuth2Request } from '../../http/index.ts';
import { OAuth2Error } from '../../errors/index.ts';
import { validateURL } from '../../internals/index.ts';


/**
 * @group OAuth2Request
 */
export interface UserInfo {
  [key: string]: JsonPrimitive;
}

/**
 * @internal
 */
export namespace UserInfo {
  /**
   * @internal
   */
  export interface RequestParams extends OAuth2Request.RequestParams {
    token: Token
  }

  /**
   * @internal
   */
  export class Request extends OAuth2Request {
    token: Token;
  
    constructor (params: RequestParams) {
      const { openIdConfiguration, clientConfiguration, token } = params;
      super({ openIdConfiguration, clientConfiguration });
      this.token = token;
  
      this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
    }
  
    get url (): string {
      if (!validateURL(this.openIdConfiguration?.userinfo_endpoint, this.clientConfiguration.allowHTTP)) {
        throw new OAuth2Error('missing `userinfo_endpoint`');
      }
  
      return this.openIdConfiguration.userinfo_endpoint!;
    }
  }
}
