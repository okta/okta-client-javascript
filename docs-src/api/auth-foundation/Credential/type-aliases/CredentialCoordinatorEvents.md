[@okta/auth-foundation](../..) / [Credential](../index.md) / CredentialCoordinatorEvents

# Type Alias: CredentialCoordinatorEvents

> **CredentialCoordinatorEvents** = `object` & [`Pick`](https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys)\<[`TokenStorageEvents`](../interfaces/TokenStorageEvents.md), `"default_changed"` \| `"metadata_updated"` \| `"token_replaced"`\> & [`CredentialDataSourceEvents`](CredentialDataSourceEvents.md)

## Type Declaration

### credential\_expired

> **credential\_expired**: `object`

#### credential\_expired.credential

> **credential**: [`Credential`](../classes/Credential.md)

### credential\_refreshed

> **credential\_refreshed**: `object`

#### credential\_refreshed.credential

> **credential**: [`Credential`](../classes/Credential.md)

### cleared

> **cleared**: `void`
