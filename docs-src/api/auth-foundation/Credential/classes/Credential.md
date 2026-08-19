[@okta/auth-foundation](../..) / [Credential](../index.md) / Credential

# Class: Credential

Wrapper around a [Token](../../Token/index.md), providing methods to interact with Tokens without the hassle of managing them

## See

* [Guide: Managing User Credentials](../../../../../../../../../../docs/guides/Credential.md)

## Implements

- [`RequestAuthorizer`](../../Core/interfaces/RequestAuthorizer.md)
- [`JSONSerializable`](../../Core/interfaces/JSONSerializable.md)

## Constructors

### Constructor

> **new Credential**(`token`, `client`, `metadata?`): `Credential`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `token` | [`Token`](../../Token/index.md) |
| `client` | [`OAuth2Client`](../../OAuth2/OAuth2Client/index.md) |
| `metadata?` | [`Metadata`](../../Token/type-aliases/Metadata.md) |

#### Returns

`Credential`

#### Remarks

Do not use directly, use [Credential.store](#store) instead

## Factory Methods

### store()

> `static` **store**(`token`, `tags?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`Credential`\>

Writes `token` to storage and returns a Credential instance

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `token` | [`Token`](../../Token/index.md) | `undefined` | Object representing the token to be managed by returned Credential instance |
| `tags` | `string`[] | `[]` | List of strings that can be used to ease Credential retrieval |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`Credential`\>

#### Example

```ts
const adminToken = await fetchAdminToken();
const token = new Token(adminToken);
Credential.store(token, ['admin']);
```

## Static Accessors

### getDefault()

> `static` **getDefault**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`Credential` \| `null`\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`Credential` \| `null`\>

***

### setDefault()

> `static` **setDefault**(`cred`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `cred` | `Credential` \| `null` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### allIDs()

> `static` **allIDs**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string`[]\>

Returns array of all Credential ids

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string`[]\>

***

### size

#### Get Signature

> **get** `static` **size**(): `number`

Returns number of Credential instances

##### Returns

`number`

## Static Methods

### with()

> `static` **with**(`id`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`Credential` \| `null`\>

Returns Credential instance with corresponding [id](#id)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`Credential` \| `null`\>

#### Remarks

This method can be used to retreive a specific Credential, however its recommended to use
[Credential.getDefault](#getdefault) or [Credential.find](#find) to query by [tags](#tags) instead

***

### find()

> `static` **find**(`matcher`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`Credential`[]\>

Returns all Credential instances where `matcher` function returns `true`

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `matcher` | \{ `issuer?`: `string` \| `string`[]; `clientId?`: `string` \| `string`[]; `scopes?`: `string` \| `string`[]; `dpopPairId?`: `string` \| `string`[]; `acrValues?`: `string` \| `string`[]; `maxAge?`: `string` \| `string`[]; `clientSettings?`: `string` \| `string`[]; `id?`: `string` \| `string`[]; `tags?`: `string` \| `string`[]; `claims?`: `string` \| `string`[]; \} \| ((`meta`) => `boolean`) | Function which takes `meta` as first argument. Returns `true` if Credential should be included, `false` otherwise *Shorthand* Pass an object with any key in [Token.Metadata](../../Token/type-aliases/Metadata.md) and a string value to match on. |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`Credential`[]\>

#### Example

```ts
// find Credentials by tag 'foo'
Credential.find(meta => meta?.tags?.includes('foo'));

// shorthand - find Credentials by tag 'foo'
Credential.find({ tags: 'foo' });
```

***

### clear()

> `static` **clear**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Removes all Credential instances and clears storage

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

***

### isEqual()

> `static` **isEqual**(`lhs`, `rhs`): `boolean`

Compares 2 Credential instances to determine if they represent the same token

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `lhs` | `Credential` |
| `rhs` | `Credential` |

#### Returns

`boolean`

## Events

### on()

> `static` **on**(...`args`): `void`

Binds a listener for the specificed event.
Alias for `Credential.emitter.on`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[`"credential_added"` \| `"credential_removed"` \| `"default_changed"` \| `"token_replaced"` \| `"metadata_updated"` \| `"credential_expired"` \| `"credential_refreshed"` \| `"cleared"` \| `"tags_updated"`, (() => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`)\] |

#### Returns

`void`

#### Example

```ts
Credential.on('credential_refreshed', ({ credential }) => {
  // do something with credential
});
```

***

### off()

> `static` **off**(...`args`): `void`

When a `handler` is provided, it is removed as a listener to the specified event `eventName`.

When no `handler` is provided, all listeners for the specified event are removed.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`args` | \[`"credential_added"` \| `"credential_removed"` \| `"default_changed"` \| `"token_replaced"` \| `"metadata_updated"` \| `"credential_expired"` \| `"credential_refreshed"` \| `"cleared"` \| `"tags_updated"`, (() => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`) \| ((`event`) => `void`)\] | - |

#### Returns

`void`

#### Remarks

This method will no-op if the `function` provided as `handler` is not a registered listener
to the provided `eventName`

#### Example

```ts
Credential.off('credential_refreshed');
```

## Properties

### emitter

> `protected` `readonly` `static` **emitter**: [`EventEmitter`](../../Core/classes/EventEmitter.md)\<[`CredentialEvents`](../type-aliases/CredentialEvents.md)\>

Possible events mapped in [CredentialEvents](../type-aliases/CredentialEvents.md)

## Accessors

### oauth2

#### Get Signature

> **get** **oauth2**(): [`OAuth2Client`](../../OAuth2/OAuth2Client/index.md)

Returns instance of [OAuth2Client](../../OAuth2/OAuth2Client/index.md) used to construct Credential

##### Returns

[`OAuth2Client`](../../OAuth2/OAuth2Client/index.md)

***

### token

#### Get Signature

> **get** **token**(): [`Token`](../../Token/index.md)

The [Token](../../Token/index.md) instance Credential is associated with

##### Remarks

This value may change, from operations like [Credential.refresh](#refresh),
however the [Token.id](../../Token/index.md#id) will remain consistent

##### Returns

[`Token`](../../Token/index.md)

***

### id

#### Get Signature

> **get** **id**(): `string`

Short for `this.token.id`

##### Returns

`string`

***

### tags

#### Get Signature

> **get** **tags**(): `string`[]

Array of tags associated with Credential. Used for retrieval

##### Returns

`string`[]

## Methods

### setTags()

> **setTags**(`tags?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Updates tags associated with Credential

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `tags` | `string`[] | `[]` | tags to be associated with Credential |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Remarks

This is *not* merge operation

***

### remove()

> **remove**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Removes Credential from storage

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Remarks

**NOTE:** this method *does not* revoke tokens

#### See

[Credential.prototype.revoke](#revoke)

***

### getAuthHeader()

> **getAuthHeader**(): `object`

Helper method to get a `Authorization` header, expressed as an object

#### Returns

`object`

##### Authorization

> **Authorization**: `string`

#### Examples

```ts
cred.getAuthHeader();
// { 'Authorization': 'Bearer ***********' }
```

```ts
const data = await fetch('resource/server', { headers: { ...cred.getAuthHeader() }})
```

***

### authorize()

> **authorize**(`input`, `init?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Request`](https://developer.mozilla.org/docs/Web/API/Request)\>

A utility method which matches the signature of [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
a [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) instance with a predefined `Authorization` header

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL) \| [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |
| `init` | `RequestInit` & `object` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`Request`](https://developer.mozilla.org/docs/Web/API/Request)\>

#### Implementation of

[`RequestAuthorizer`](../../Core/interfaces/RequestAuthorizer.md).[`authorize`](../../Core/interfaces/RequestAuthorizer.md#authorize)

***

### toJSON()

> **toJSON**(): [`JsonRecord`](../../Core/type-aliases/JsonRecord.md)

#### Returns

[`JsonRecord`](../../Core/type-aliases/JsonRecord.md)

#### Implementation of

[`JSONSerializable`](../../Core/interfaces/JSONSerializable.md).[`toJSON`](../../Core/interfaces/JSONSerializable.md#tojson)

## OAuth2 Methods

### refresh()

> **refresh**(): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Attempts to refresh the represented `token`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Remarks

Upon successful refresh, the `token` will be replaced with a new
[Token](../../Token/index.md) instance, however the `id` property will remain consistent

#### Throws

[OAuth2Error](../../Core/classes/OAuth2Error.md) if refresh fails

***

### refreshIfNeeded()

> **refreshIfNeeded**(`gracePeriod?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Renews `token` if the will expire within the grace period

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `gracePeriod` | `number` | `30` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Remarks

Expiration calculation is performed on the browser via `TimeCoordinator`

#### Throws

[OAuth2Error](../../Core/classes/OAuth2Error.md) if refresh fails

***

### revoke()

> **revoke**(`type?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Revokes either [token.accessToken](../../Token/index.md#accesstoken) or
[token.refreshToken](../../Token/index.md#refreshtoken) or both

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `type` | `"ALL"` \| `"ACCESS"` \| `"REFRESH"` | `'ALL'` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

#### Remarks

* If `RevokeType.ALL`, Credential will be removed

#### Throws

[OAuth2Error](../../Core/classes/OAuth2Error.md) if revocation fails

#### See

[Okta Docs](https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/CustomAS/#tag/CustomAS/operation/revokeCustomAS)
[OAuth2 Reference](https://oauth.net/2/token-revocation/)
[RFC](https://datatracker.ietf.org/doc/html/rfc7009)

***

### introspect()

> **introspect**(`kind`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`IntrospectResponse`](../../Token/type-aliases/IntrospectResponse.md)\>

Performs introspect on a specific token

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `kind` | `"refresh_token"` \| `"access_token"` \| `"id_token"` | The specific token to introspect. Must be available in [Credential.token](#token) |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`IntrospectResponse`](../../Token/type-aliases/IntrospectResponse.md)\>

#### Throws

[OAuth2Error](../../Core/classes/OAuth2Error.md)

#### See

[Okta Docs](https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/CustomAS/#tag/CustomAS/operation/introspectCustomAS)
[OAuth2 Reference](https://oauth.net/2/token-introspection/)

***

### userInfo()

> **userInfo**(`ignoreCache?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<\{\[`key`: `string`\]: [`JsonPrimitive`](../../Core/type-aliases/JsonPrimitive.md); \}\>

Performs OIDC UserInfo request

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `ignoreCache` | `boolean` | `false` | When `false` any previously fetched result will be returned rather than making a network request. Defaults to `false` |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<\{\[`key`: `string`\]: [`JsonPrimitive`](../../Core/type-aliases/JsonPrimitive.md); \}\>

#### Throws

[OAuth2Error](../../Core/classes/OAuth2Error.md)

#### See

[Okta Docs](https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/CustomAS/#tag/CustomAS/operation/userinfoCustomAS)
[OIDC Spec](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)
