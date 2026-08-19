[@okta/oauth2-flows](../..) / [Core](../index-1.md) / LogoutFlowError

# Class: LogoutFlowError

Thrown when a [LogoutFlow](../LogoutFlow/index.md) is used incorrectly

## Extends

- [`AuthSdkError`](/api/auth-foundation)

## Constructors

### Constructor

> **new LogoutFlowError**(`message?`, `options?`): `LogoutFlowError`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message?` | `string` |
| `options?` | `ErrorOptions` & `object` |

#### Returns

`LogoutFlowError`

#### Inherited from

`AuthSdkError.constructor`

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

`AuthSdkError.prepareStackTrace`

***

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

#### Inherited from

`AuthSdkError.stackTraceLimit`

***

### context

> **context**: [`JsonRecord`](/api/auth-foundation)

A dictionary to store the context in which the error was thrown
For example: The authentication context when an error is thrown during an authentication flow

#### Inherited from

`AuthSdkError.context`

***

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

`AuthSdkError.cause`

***

### name

> **name**: `string`

#### Inherited from

`AuthSdkError.name`

***

### message

> **message**: `string`

#### Inherited from

`AuthSdkError.message`

***

### stack?

> `optional` **stack?**: `string`

#### Inherited from

`AuthSdkError.stack`

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

`AuthSdkError.captureStackTrace`
