/**
 * @module Networking
 * 
 * @groupDescription WWWAuthenticate
 * A collection of utilities for parsing `www-autheticate` headers
 * * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/WWW-Authenticate | MDN - WWW-Authenticate}
 * * {@link https://datatracker.ietf.org/doc/html/rfc7235#section-4.1 | RFC 7235 - WWW-Authenticate}
 */

export * from './requests/OAuth2Request.ts';
export * from './APIClient.ts';
export * as WWWAuth from './wwwAuthenticate.ts';