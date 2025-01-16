export interface OAuth2FlowOptions {
  issuer: string | URL;
  clientId: string;
  scopes: string | string[];
  dpop?: boolean;
}

export type AuthContext = Record<string, any>;
