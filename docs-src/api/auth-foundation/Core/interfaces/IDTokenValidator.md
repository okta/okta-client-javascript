[@okta/auth-foundation](../..) / [Core](../index.md) / IDTokenValidator

# Interface: IDTokenValidator

Performs ID token validation, conforming to [OIDC Spec](https://openid.net/specs/openid-connect-core-1_0.html)

A default implementation is provided by this library. To override, set `OAuth2Client.idTokenValidator`
```ts
const customValidator: IDTokenValidator = { ... };
OAuth2Client.idTokenValidator = customValidator;
```

## See

* [OIDC Spec: ID Token Validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)

## Properties

### issuedAtGraceInterval

> **issuedAtGraceInterval**: `number`

Defines a grace period for when performing time-based validations

***

### checks

> **checks**: (`"nonce"` \| `"issuer"` \| `"audience"` \| `"scheme"` \| `"algorithm"` \| `"expirationTime"` \| `"issuedAtTime"` \| `"maxAge"` \| `"subject"` \| `"acr"`)[]

By convention, a list of all validation checks performed within [IDTokenValidator.validate](#validate).

See [IDTokenValidator.validate](#validate) for more details.

***

### validate

> **validate**: (`token`, `issuer`, `clientId`, `context?`) => `void`

Validates ID tokens by performing a series of checks, listed by name in [IDTokenValidator.checks](#checks)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `token` | [`JWT`](../classes/JWT.md) | The ID token to be validated |
| `issuer` | [`URL`](https://developer.mozilla.org/docs/Web/API/URL) | The issuer (URL) from which the ID token was issued from |
| `clientId` | `string` | The `client_id` from which the ID token was issued from |
| `context?` | [`IDTokenValidatorContext`](IDTokenValidatorContext.md) | Additional context needed to validate the ID token |

#### Returns

`void`

#### Throws

[JWTError](../classes/JWTError.md) if a validation check fails

#### Remarks

By design, [IDTokenValidator.checks](#checks) is a list of all validation checks performed within [IDTokenValidator.validate](#validate).
This is done to simplify disabling a specific check (as seen the example below). This is not a requirement however. 
If a custom IDTokenValidator is provided, the `validate` does not need to utilize this pattern.

#### Example

How to disable a specific validation check
```ts
const currentChecks = OAuth2Client.idTokenValidator.checks;
OAuth2Client.idTokenValidator.checks = currentChecks.filter(check !== 'expirationTime');
// the 'expirationTime' validation check will now be skipped
```

#### See

* [OIDC Spec: ID Token Validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)
