[@okta/auth-foundation](../..) / [Core](../index.md) / TokenHashValidator

# Interface: TokenHashValidator

A validator for validating tokens via hash claims. Used in OIDC to validate access tokens (`at_hash`) and
device secrets (`ds_hash`) associated with an ID token

## See

* [OIDC Spec: Access Token Validation](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowTokenValidation)
* [OIDC Native SSO: ID Token Claims](https://openid.net/specs/openid-connect-native-sso-1_0.html#section-3.4.1-2.1.2.2)

## Properties

### validate

> **validate**: (`token`, `idToken`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `token` | `string` |
| `idToken` | [`JWT`](../classes/JWT.md) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>
