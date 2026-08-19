[@okta/auth-foundation](../..) / [Core](../index.md) / TokenError

# Class: TokenError

Thrown when a [Token](../../Token/index.md) instance encounters an unexpected condition

## Extends

- [`AuthSdkError`](AuthSdkError.md)

## Constructors

### Constructor

> **new TokenError**(`message?`, `options?`): `TokenError`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message?` | `string` |
| `options?` | `ErrorOptions` & `object` |

#### Returns

`TokenError`

#### Inherited from

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
