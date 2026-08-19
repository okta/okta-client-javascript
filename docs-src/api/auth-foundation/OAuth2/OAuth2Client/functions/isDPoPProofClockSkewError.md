[@okta/auth-foundation](../../..) / [OAuth2](../../index.md) / [OAuth2Client](../index.md) / isDPoPProofClockSkewError

# Function: isDPoPProofClockSkewError()

> **isDPoPProofClockSkewError**(`error`): `boolean`

When a client has the incorrect time, all DPoP JWTs signed by the client will be rejected by the
authorization or resource server because the JWT's claims cannot be validated. This method checks
server responses for this specific error condition.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | [`OAuth2ErrorResponse`](../../interfaces/OAuth2ErrorResponse.md) |

## Returns

`boolean`

## Remarks

This method has only been tested against Okta authorization servers. Different IDPs may use a
different `error_description`.
