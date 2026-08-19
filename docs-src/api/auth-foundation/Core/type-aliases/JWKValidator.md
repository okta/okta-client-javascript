[@okta/auth-foundation](../..) / [Core](../index.md) / JWKValidator

# Type Alias: JWKValidator

> **JWKValidator** = `object`

Verifies the signature of a [JWT](../classes/JWT.md) signed by a [JWK](../interfaces/JWK.md).

## Remarks

Accepts a [JWKS](JWKS.md) (aka `JWK[]`) to ease use with the results of a `jwks_uri` request.

## See

* [RFC 7519 - JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519|)
* [RFC 7517 - JSON Web Key (JWK)](https://datatracker.ietf.org/doc/html/rfc7517|)

## Properties

| Property | Type |
| ------ | ------ |
| <a id="property-validate"></a> `validate` | (`token`, `keySet`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`boolean`\> |
