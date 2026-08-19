[@okta/oauth2-flows](..) / Core

# Core

## Classes

| Class | Description |
| ------ | ------ |
| [AuthenticationFlow](AuthenticationFlow/index.md) | Base class shared by all OAuth2/OIDC flows in this package (e.g. [AuthorizationCodeFlow](../AuthorizationCodeFlow/index.md)), providing the common bits every flow needs: progress tracking and a shared [event](type-aliases/AuthenticationFlowEvents.md) surface. |

## Errors

| Class | Description |
| ------ | ------ |
| [AuthenticationFlowError](classes/AuthenticationFlowError.md) | Thrown when an [AuthenticationFlow](AuthenticationFlow/index.md) is used incorrectly, such as starting a flow that is already [in progress](AuthenticationFlow/index.md#inprogress) |

## EventEmitter

| Type Alias | Description |
| ------ | ------ |
| [AuthenticationFlowEvents](type-aliases/AuthenticationFlowEvents.md) | Events emitted by every [AuthenticationFlow](AuthenticationFlow/index.md) |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [TransactionStorage](interfaces/TransactionStorage.md) | Persists contextual data across the redirect to and from an Authorization Server, keyed by the transaction's `state` value |

## Namespaces

| Namespace | Description |
| ------ | ------ |
| [AuthenticationFlow](AuthenticationFlow/index.md) | - |
