/**
 * @module
 * @mergeModuleWith OAuth2
 */

/**
 * Interface defining the response payload from `/.well-known/openid-configuration`
 */
export interface OpenIdConfiguration {
  /**
   * Authorization server's Issuer Identifier URL.
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
   * URL of the authorization server's Dynamic Client Registration Endpoint.
   */
  readonly registration_endpoint?: string;
  /**
   * JSON array containing a list of the `scope` values that this authorization server supports.
   */
  readonly scopes_supported?: string[];
  /**
   * JSON array containing a list of the `response_type` values that this authorization server
   * supports.
   */
  readonly response_types_supported?: string[];
  /**
   * JSON array containing a list of the `response_mode` values that this authorization server
   * supports.
   */
  readonly response_modes_supported?: string[];
  /**
   * JSON array containing a list of the `grant_type` values that this authorization server
   * supports.
   */
  readonly grant_types_supported?: string[];
  /**
   * JSON array containing a list of client authentication methods supported by this token endpoint.
   */
  readonly token_endpoint_auth_methods_supported?: string[];
  /**
   * JSON array containing a list of the JWS signing algorithms supported by the token endpoint for
   * the signature on the JWT used to authenticate the client at the token endpoint.
   */
  readonly token_endpoint_auth_signing_alg_values_supported?: string[];
  /**
   * URL of a page containing human-readable information that developers might want or need to know
   * when using the authorization server.
   */
  readonly service_documentation?: string;
  /**
   * Languages and scripts supported for the user interface, represented as a JSON array of language
   * tag values from RFC 5646.
   */
  readonly ui_locales_supported?: string[];
  /**
   * URL that the authorization server provides to the person registering the client to read about
   * the authorization server's requirements on how the client can use the data provided by the
   * authorization server.
   */
  readonly op_policy_uri?: string;
  /**
   * URL that the authorization server provides to the person registering the client to read about
   * the authorization server's terms of service.
   */
  readonly op_tos_uri?: string;
  /**
   * URL of the authorization server's revocation endpoint.
   */
  readonly revocation_endpoint?: string;
  /**
   * JSON array containing a list of client authentication methods supported by this revocation
   * endpoint.
   */
  readonly revocation_endpoint_auth_methods_supported?: string[];
  /**
   * JSON array containing a list of the JWS signing algorithms supported by the revocation endpoint
   * for the signature on the JWT used to authenticate the client at the revocation endpoint.
   */
  readonly revocation_endpoint_auth_signing_alg_values_supported?: string[];
  /**
   * URL of the authorization server's introspection endpoint.
   */
  readonly introspection_endpoint?: string;
  /**
   * JSON array containing a list of client authentication methods supported by this introspection
   * endpoint.
   */
  readonly introspection_endpoint_auth_methods_supported?: string[];
  /**
   * JSON array containing a list of the JWS signing algorithms supported by the introspection
   * endpoint for the signature on the JWT used to authenticate the client at the introspection
   * endpoint.
   */
  readonly introspection_endpoint_auth_signing_alg_values_supported?: string[];
  /**
   * PKCE code challenge methods supported by this authorization server.
   */
  readonly code_challenge_methods_supported?: string[];
  /**
   * Signed JWT containing metadata values about the authorization server as claims.
   */
  readonly signed_metadata?: string;
  /**
   * URL of the authorization server's device authorization endpoint.
   */
  readonly device_authorization_endpoint?: string;
  /**
   * Indicates authorization server support for mutual-TLS client certificate-bound access tokens.
   */
  readonly tls_client_certificate_bound_access_tokens?: boolean;
  /**
   * JSON object containing alternative authorization server endpoints, which a client intending to
   * do mutual TLS will use in preference to the conventional endpoints.
   */
  // TODO: mtls
  // readonly mtls_endpoint_aliases?: MTLSEndpointAliases;
  /**
   * URL of the authorization server's UserInfo Endpoint.
   */
  readonly userinfo_endpoint?: string;
  /**
   * JSON array containing a list of the Authentication Context Class References that this
   * authorization server supports.
   */
  readonly acr_values_supported?: string[];
  /**
   * JSON array containing a list of the Subject Identifier types that this authorization server
   * supports.
   */
  readonly subject_types_supported?: string[];
  /**
   * JSON array containing a list of the JWS `alg` values supported by the authorization server for
   * the ID Token.
   */
  readonly id_token_signing_alg_values_supported?: string[];
  /**
   * JSON array containing a list of the JWE `alg` values supported by the authorization server for
   * the ID Token.
   */
  readonly id_token_encryption_alg_values_supported?: string[];
  /**
   * JSON array containing a list of the JWE `enc` values supported by the authorization server for
   * the ID Token.
   */
  readonly id_token_encryption_enc_values_supported?: string[];
  /**
   * JSON array containing a list of the JWS `alg` values supported by the UserInfo Endpoint.
   */
  readonly userinfo_signing_alg_values_supported?: string[];
  /**
   * JSON array containing a list of the JWE `alg` values supported by the UserInfo Endpoint.
   */
  readonly userinfo_encryption_alg_values_supported?: string[];
  /**
   * JSON array containing a list of the JWE `enc` values supported by the UserInfo Endpoint.
   */
  readonly userinfo_encryption_enc_values_supported?: string[];
  /**
   * JSON array containing a list of the JWS `alg` values supported by the authorization server for
   * Request Objects.
   */
  readonly request_object_signing_alg_values_supported?: string[];
  /**
   * JSON array containing a list of the JWE `alg` values supported by the authorization server for
   * Request Objects.
   */
  readonly request_object_encryption_alg_values_supported?: string[];
  /**
   * JSON array containing a list of the JWE `enc` values supported by the authorization server for
   * Request Objects.
   */
  readonly request_object_encryption_enc_values_supported?: string[];
  /**
   * JSON array containing a list of the `display` parameter values that the authorization server
   * supports.
   */
  readonly display_values_supported?: string[];
  /**
   * JSON array containing a list of the Claim Types that the authorization server supports.
   */
  readonly claim_types_supported?: string[];
  /**
   * JSON array containing a list of the Claim Names of the Claims that the authorization server MAY
   * be able to supply values for.
   */
  readonly claims_supported?: string[];
  /**
   * Languages and scripts supported for values in Claims being returned, represented as a JSON
   * array of RFC 5646 language tag values.
   */
  readonly claims_locales_supported?: string[];
  /**
   * Boolean value specifying whether the authorization server supports use of the `claims`
   * parameter.
   */
  readonly claims_parameter_supported?: boolean;
  /**
   * Boolean value specifying whether the authorization server supports use of the `request`
   * parameter.
   */
  readonly request_parameter_supported?: boolean;
  /**
   * Boolean value specifying whether the authorization server supports use of the `request_uri`
   * parameter.
   */
  readonly request_uri_parameter_supported?: boolean;
  /**
   * Boolean value specifying whether the authorization server requires any `request_uri` values
   * used to be pre-registered.
   */
  readonly require_request_uri_registration?: boolean;
  /**
   * Indicates where authorization request needs to be protected as Request Object and provided
   * through either `request` or `request_uri` parameter.
   */
  readonly require_signed_request_object?: boolean;
  /**
   * URL of the authorization server's pushed authorization request endpoint.
   */
  readonly pushed_authorization_request_endpoint?: string;
  /**
   * Indicates whether the authorization server accepts authorization requests only via PAR.
   */
  readonly require_pushed_authorization_requests?: boolean;
  /**
   * JSON array containing a list of algorithms supported by the authorization server for
   * introspection response signing.
   */
  readonly introspection_signing_alg_values_supported?: string[];
  /**
   * JSON array containing a list of algorithms supported by the authorization server for
   * introspection response content key encryption (`alg` value).
   */
  readonly introspection_encryption_alg_values_supported?: string[];
  /**
   * JSON array containing a list of algorithms supported by the authorization server for
   * introspection response content encryption (`enc` value).
   */
  readonly introspection_encryption_enc_values_supported?: string[];
  /**
   * Boolean value indicating whether the authorization server provides the `iss` parameter in the
   * authorization response.
   */
  readonly authorization_response_iss_parameter_supported?: boolean;
  /**
   * JSON array containing a list of algorithms supported by the authorization server for
   * introspection response signing.
   */
  readonly authorization_signing_alg_values_supported?: string[];
  /**
   * JSON array containing a list of algorithms supported by the authorization server for
   * introspection response encryption (`alg` value).
   */
  readonly authorization_encryption_alg_values_supported?: string[];
  /**
   * JSON array containing a list of algorithms supported by the authorization server for
   * introspection response encryption (`enc` value).
   */
  readonly authorization_encryption_enc_values_supported?: string[];
  /**
   * CIBA Backchannel Authentication Endpoint.
   */
  readonly backchannel_authentication_endpoint?: string;
  /**
   * JSON array containing a list of the JWS signing algorithms supported for validation of signed
   * CIBA authentication requests.
   */
  readonly backchannel_authentication_request_signing_alg_values_supported?: string[];
  /**
   * Supported CIBA authentication result delivery modes.
   */
  readonly backchannel_token_delivery_modes_supported?: string[];
  /**
   * Indicates whether the authorization server supports the use of the CIBA `user_code` parameter.
   */
  readonly backchannel_user_code_parameter_supported?: boolean;
  /**
   * URL of an authorization server iframe that supports cross-origin communications for session
   * state information with the RP Client, using the HTML5 postMessage API.
   */
  readonly check_session_iframe?: string;
  /**
   * JSON array containing a list of the JWS algorithms supported for DPoP proof JWTs.
   */
  readonly dpop_signing_alg_values_supported?: string[];
  /**
   * URL at the authorization server to which an RP can perform a redirect to request that the
   * End-User be logged out at the authorization server.
   */
  readonly end_session_endpoint?: string;
  /**
   * Boolean value specifying whether the authorization server can pass `iss` (issuer) and `sid`
   * (session ID) query parameters to identify the RP session with the authorization server when the
   * `frontchannel_logout_uri` is used.
   */
  readonly frontchannel_logout_session_supported?: boolean;
  /**
   * Boolean value specifying whether the authorization server supports HTTP-based logout.
   */
  readonly frontchannel_logout_supported?: boolean;
  /**
   * Boolean value specifying whether the authorization server can pass a `sid` (session ID) Claim
   * in the Logout Token to identify the RP session with the OP.
   */
  readonly backchannel_logout_session_supported?: boolean;
  /**
   * Boolean value specifying whether the authorization server supports back-channel logout.
   */
  readonly backchannel_logout_supported?: boolean;
  
  // TODO: json values
  // readonly [metadata: string]: JsonValue | undefined;
}
