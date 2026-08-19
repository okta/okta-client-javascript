[@okta/auth-foundation](../..) / [Credential](../index.md) / TokenStorageEvents

# Interface: TokenStorageEvents

Map of events fired from [TokenStorage.emitter](TokenStorage.md#emitter)

## Properties

### token\_added

> **token\_added**: `object` & `object`

#### Type Declaration

| Name | Type |
| ------ | ------ |
| `storage` | [`TokenStorage`](TokenStorage.md) |
| `id` | `string` |

#### Type Declaration

| Name | Type |
| ------ | ------ |
| `token` | [`Token`](../../Token/index.md) |

***

### token\_removed

> **token\_removed**: `object`

| Name | Type |
| ------ | ------ |
| `storage` | [`TokenStorage`](TokenStorage.md) |
| `id` | `string` |

***

### token\_replaced

> **token\_replaced**: `object` & `object`

#### Type Declaration

| Name | Type |
| ------ | ------ |
| `storage` | [`TokenStorage`](TokenStorage.md) |
| `id` | `string` |

#### Type Declaration

| Name | Type |
| ------ | ------ |
| `token` | [`Token`](../../Token/index.md) |

***

### default\_changed

> **default\_changed**: [`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)\<\{ `storage`: [`TokenStorage`](TokenStorage.md); `id`: `string`; \}, `"id"`\> & `object`

#### Type Declaration

| Name | Type |
| ------ | ------ |
| `id` | `string` \| `null` |

***

### metadata\_updated

> **metadata\_updated**: `object` & `object`

#### Type Declaration

| Name | Type |
| ------ | ------ |
| `storage` | [`TokenStorage`](TokenStorage.md) |
| `id` | `string` |

#### Type Declaration

| Name | Type |
| ------ | ------ |
| `metadata` | [`Metadata`](../../Token/type-aliases/Metadata.md) |
