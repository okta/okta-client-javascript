[@okta/spa-platform](../../..) / [Orchestrators](../../index.md) / [AuthorizationCodeFlowOrchestrator](../index.md) / Events

# Interface: Events

A map of possible events emitted by [AuthorizationCodeFlowOrchestrator.emitter](../index.md#emitter)

## Properties

### error

> **error**: `object`

| Name | Type |
| ------ | ------ |
| `error` | [`Error`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error) \| [`JsonRecord`](/api/auth-foundation) |
| `type?` | `string` |

***

### login\_prompt\_required

> **login\_prompt\_required**: `object`

| Name | Type |
| ------ | ------ |
| `done()` | () => `void` |
| `params` | [`AuthorizeParams`](/api/auth-foundation) |
