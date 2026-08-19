[@okta/auth-foundation](../../..) / [Core](../../index.md) / IDTokenValidator

# IDTokenValidator

Performs ID token validation, conforming to [OIDC Spec](https://openid.net/specs/openid-connect-core-1_0.html)

A default implementation is provided by this library. To override, set `OAuth2Client.idTokenValidator`
```ts
const customValidator: IDTokenValidator = { ... };
OAuth2Client.idTokenValidator = customValidator;
```

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ValidationCheck](type-aliases/ValidationCheck.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [allValidationChecks](variables/allValidationChecks.md) | A list of validition checks which will be performed to validate a [JWT](../../classes/JWT.md) |
