[@okta/auth-foundation](..) / Credential

# Credential

## Classes

| Class | Description |
| ------ | ------ |
| [Credential](classes/Credential.md) | Wrapper around a [Token](../Token/index.md), providing methods to interact with Tokens without the hassle of managing them |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CredentialCoordinator](interfaces/CredentialCoordinator.md) | Holds the implementation of most [Credential](classes/Credential.md) methods. Bridges the [CredentialDataSource](interfaces/CredentialDataSource.md) and [TokenStorage](interfaces/TokenStorage.md) layers together |
| [CredentialDataSource](interfaces/CredentialDataSource.md) | Prevents multiple instances of [Credential](classes/Credential.md) from existing for the same [Token](../Token/index.md) |
| [TokenStorageEvents](interfaces/TokenStorageEvents.md) | Map of events fired from [TokenStorage.emitter](interfaces/TokenStorage.md#emitter) |
| [TokenStorage](interfaces/TokenStorage.md) | Defines interface for token storage. [Token](../Token/index.md) and [Token.Metadata](../Token/type-aliases/Metadata.md) are treated as independent entities, which enables them to be stored in different locations. This may be more relevant in mobile environments, where [Token](../Token/index.md) data can be written to a secure location (which requires biometrics to access) and [Token.Metadata](../Token/type-aliases/Metadata.md), containing only non-sensitive info can be stored in a more accessible location and used to query which tokens are available (without prompting biometrics) |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [CredentialEvents](type-aliases/CredentialEvents.md) | - |
| [CredentialCoordinatorEvents](type-aliases/CredentialCoordinatorEvents.md) | - |
| [CredentialDataSourceEvents](type-aliases/CredentialDataSourceEvents.md) | - |
