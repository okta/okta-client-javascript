[@okta/auth-foundation](../..) / [Core](../index.md) / OAuth2Error

# Class: OAuth2Error

Thrown when an OAuth2 request (like /token) returns an error status

## Extends

- [`AuthSdkError`](AuthSdkError.md)

## Constructors

### Constructor

> **new OAuth2Error**(`error`, `description?`, `uri?`): `OAuth2Error`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | `string` \| [`OAuth2ErrorResponse`](../../OAuth2/interfaces/OAuth2ErrorResponse.md) |
| `description?` | `string` |
| `uri?` | `string` |

#### Returns

`OAuth2Error`

#### Overrides

[`AuthSdkError`](AuthSdkError.md).[`constructor`](AuthSdkError.md#constructor)

## Properties

### prepareStackTrace?

> `static` `optional` **prepareStackTrace?**: (`err`, `stackTraces`) => `any`

Optional override for formatting stack traces

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `err` | [`Error`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error) |
| `stackTraces` | `CallSite`[] |

#### Returns

`any`

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Inherited from

[`AuthSdkError`](AuthSdkError.md).[`prepareStackTrace`](AuthSdkError.md#preparestacktrace)

***

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

#### Inherited from

[`AuthSdkError`](AuthSdkError.md).[`stackTraceLimit`](AuthSdkError.md#stacktracelimit)

***

### context

> **context**: [`JsonRecord`](../type-aliases/JsonRecord.md) = `{}`

A dictionary to store the context in which the error was thrown
For example: The authentication context when an error is thrown during an authentication flow

#### Inherited from

[`AuthSdkError`](AuthSdkError.md).[`context`](AuthSdkError.md#context)

***

### description?

> `optional` **description?**: `string`

***

### uri?

> `optional` **uri?**: `string`

***

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

[`AuthSdkError`](AuthSdkError.md).[`cause`](AuthSdkError.md#cause)

***

### name

> **name**: `string`

#### Inherited from

[`AuthSdkError`](AuthSdkError.md).[`name`](AuthSdkError.md#name)

***

### message

> **message**: `string`

#### Inherited from

[`AuthSdkError`](AuthSdkError.md).[`message`](AuthSdkError.md#message)

***

### stack?

> `optional` **stack?**: `string`

#### Inherited from

[`AuthSdkError`](AuthSdkError.md).[`stack`](AuthSdkError.md#stack)

## Accessors

### error

#### Get Signature

> **get** **error**(): `string`

##### Returns

`string`

## Methods

### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Create .stack property on a target object

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `targetObject` | `object` |
| `constructorOpt?` | [`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Function) |

#### Returns

`void`

#### Inherited from

[`AuthSdkError`](AuthSdkError.md).[`captureStackTrace`](AuthSdkError.md#capturestacktrace)
