[@okta/auth-foundation](../..) / [TokenOrchestrator](../index.md) / [TokenOrchestrator](../index.md) / extractAuthParams

# Function: extractAuthParams()

> **extractAuthParams**(`input`): `object`

Utility function to separate [AuthorizeParams](../type-aliases/AuthorizeParams.md) from other options.
Intended to help separate params from intersected types in method signatures

Convenient for custom [TokenOrchestrator](../index.md) implementations

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{\[`key`: `string`\]: `any`; \} |

## Returns

`object`

### authParams

> **authParams**: [`AuthorizeParams`](../type-aliases/AuthorizeParams.md)

### rest

> **rest**: `object`

#### Index Signature

\[`key`: `string`\]: `any`
