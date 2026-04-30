/**
 * @module
 * @mergeModuleWith OAuth2
 */


/**
 * Interface defining the response payload from `/.well-known/openid-configuration`
 *
 * @see
 * * {@link https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata | OIDC Discovery 1.0 - Provider Metadata}
 */
export interface OpenIdConfiguration {
  /**
   * URL of the authorization server.
   */
  readonly issuer: string;
  /**
   * URL of the authorization server's authorization endpoint.
   */
  readonly authorization_endpoint?: string;
  /**
   * URL of the authorization server's token endpoint.
   */
  readonly token_endpoint?: string;
  /**
   * URL of the authorization server's JWK Set document.
   */
  readonly jwks_uri?: string;
  /**
   * URL of the authorization server's UserInfo endpoint.
   */
  readonly userinfo_endpoint?: string;
  /**
   * URL of the authorization server's Dynamic Client Registration endpoint.
   */
  readonly registration_endpoint?: string;
  /**
   * URL of the authorization server's introspection endpoint.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7662 | RFC 7662 - OAuth 2.0 Token Introspection}
   */
  readonly introspection_endpoint?: string;
  /**
   * `token_endpoint_auth_methods_supported` values accepted by {@link OpenIdConfiguration.introspection_endpoint}
   */
  readonly introspection_endpoint_auth_methods_supported?: string[];
  /**
   * URL of the authorization server's token revocation endpoint.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7009 | RFC 7009 - OAuth 2.0 Token Revocation}
   */
  readonly revocation_endpoint?: string;
  /**
   * `token_endpoint_auth_methods_supported` values accepted by {@link OpenIdConfiguration.revocation_endpoint}
   */
  readonly revocation_endpoint_auth_methods_supported?: string[];
  /**
   * URL of the authorization server's RP-Initiated Logout endpoint.
   * @see {@link https://openid.net/specs/openid-connect-rpinitiated-1_0.html | OIDC RP-Initiated Logout 1.0}
   */
  readonly end_session_endpoint?: string;
  /**
   * URL of the authorization server's Device Authorization endpoint.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc8628 | RFC 8628 - OAuth 2.0 Device Authorization Grant}
   */
  readonly device_authorization_endpoint?: string;
  /**
   * URL of the authorization server's Pushed Authorization Request endpoint.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc9126 | RFC 9126 - OAuth 2.0 Pushed Authorization Requests}
   */
  readonly pushed_authorization_request_endpoint?: string;
  /**
   * `response_type` values this authorization server supports
   */
  readonly response_types_supported?: string[];
  /**
   * `response_mode` values this authorization server supports
   */
  readonly response_modes_supported?: string[];
  /**
   * `grant_type` values this authorization server supports
   */
  readonly grant_types_supported?: string[];
  /**
   * Subject Identifier types this authorization server supports, e.g. `pairwise` or `public`
   */
  readonly subject_types_supported?: string[];
  /**
   * JWS `alg` values supported for signing ID Tokens
   */
  readonly id_token_signing_alg_values_supported?: string[];
  /**
   * JWE `alg` values supported for encrypting ID Tokens
   */
  readonly id_token_encryption_alg_values_supported?: string[];
  /**
   * JWE `enc` values supported for encrypting ID Tokens
   */
  readonly id_token_encryption_enc_values_supported?: string[];
  /**
   * OAuth2 `scope` values this authorization server supports
   */
  readonly scopes_supported?: string[];
  /**
   * Client authentication methods supported by {@link OpenIdConfiguration.token_endpoint}
   */
  readonly token_endpoint_auth_methods_supported?: string[];
  /**
   * Claim names the authorization server may include in an ID Token or from the {@link OpenIdConfiguration.userinfo_endpoint}
   */
  readonly claims_supported?: string[];
  /**
   * PKCE `code_challenge_method` values this authorization server supports
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7636 | RFC 7636 - Proof Key for Code Exchange (PKCE)}
   */
  readonly code_challenge_methods_supported?: string[];
  /**
   * Whether this authorization server supports use of the `request` parameter
   */
  readonly request_parameter_supported?: boolean;
  /**
   * JWS `alg` values supported for signing a JWT-encoded `request` parameter object
   */
  readonly request_object_signing_alg_values_supported?: string[];
  /**
   * Delivery modes this authorization server supports for CIBA
   * @see {@link https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html | OIDC CIBA Core 1.0}
   */
  readonly backchannel_token_delivery_modes_supported?: string[];
  /**
   * JWS `alg` values supported for signing CIBA authentication request objects
   */
  readonly backchannel_authentication_request_signing_alg_values_supported?: string[];
  /**
   * JWS `alg` values supported for DPoP proof JWTs
   * @see {@link https://datatracker.ietf.org/doc/html/rfc9449 | RFC 9449 - OAuth 2.0 Demonstrating Proof of Possession (DPoP)}
   */
  readonly dpop_signing_alg_values_supported?: string[];
}
