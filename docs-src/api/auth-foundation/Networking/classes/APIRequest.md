[@okta/auth-foundation](../..) / [Networking](../index.md) / APIRequest

# Class: APIRequest

An extension of [Request](https://developer.mozilla.org/docs/Web/API/Request) to be used within [APIClient](../APIClient/index.md).

Holds a request [context](#context) and [retry count](#retryattempt)

## Extends

- [`Request`](https://developer.mozilla.org/docs/Web/API/Request)

## Constructors

### Constructor

> **new APIRequest**(`input`, `init?`): `APIRequest`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL) \| [`Request`](https://developer.mozilla.org/docs/Web/API/Request) |
| `init` | [`APIRequestInit`](../type-aliases/APIRequestInit.md) |

#### Returns

`APIRequest`

#### Overrides

`Request.constructor`

## Properties

### MaxRetryAttempts

> `static` **MaxRetryAttempts**: `number` = `2`

Maximum number of retries which are allowed to be attempted for a given APIRequest.

#### Default Value

```ts
2
```

#### Remarks

Changing this value will only effect `APIRequest`s created _afterwards_. It will have no effect
on any prexisting instances.

***

### context

> `readonly` **context**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `any`\>

A map to store contextual information about the `APIRequest`, meaningful to the specific [APIClient](../APIClient/index.md)

## Accessors

### retryAttempt

#### Get Signature

> **get** **retryAttempt**(): `number`

##### Returns

`number`

## Methods

### canRetry()

> **canRetry**(): `boolean`

Compares the retry counter to [APIRequest.MaxRetryAttempts](#maxretryattempts)

#### Returns

`boolean`

***

### markRetry()

> **markRetry**(): `void`

Increments retry counter

#### Returns

`void`
