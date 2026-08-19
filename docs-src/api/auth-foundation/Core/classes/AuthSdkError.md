[@okta/auth-foundation](../..) / [Core](../index.md) / AuthSdkError

# Class: AuthSdkError

Base Error class for all errors defined within Okta Client JavaScript

## Extends

- [`Error`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error)

## Extended by

- [`APIClientError`](APIClientError.md)
- [`CredentialError`](CredentialError.md)
- [`DPoPError`](DPoPError.md)
- [`JWTError`](JWTError.md)
- [`NetworkError`](NetworkError.md)
- [`OAuth2Error`](OAuth2Error.md)
- [`TokenError`](TokenError.md)
- [`TokenOrchestratorError`](TokenOrchestratorError.md)
- [`PlatformRegistryError`](../../Platform/classes/PlatformRegistryError.md)
- [`TimeoutError`](../../utils/TaskBridge/classes/TimeoutError.md)

## Constructors

### Constructor

> **new AuthSdkError**(`message?`, `options?`): `AuthSdkError`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message?` | `string` |
| `options?` | `ErrorOptions` & `object` |

#### Returns

`AuthSdkError`

#### Overrides

`Error.constructor`

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

`Error.prepareStackTrace`

***

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

#### Inherited from

`Error.stackTraceLimit`

***

### context

> **context**: [`JsonRecord`](../type-aliases/JsonRecord.md) = `{}`

A dictionary to store the context in which the error was thrown
For example: The authentication context when an error is thrown during an authentication flow

***

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

`Error.cause`

***

### name

> **name**: `string`

#### Inherited from

`Error.name`

***

### message

> **message**: `string`

#### Inherited from

`Error.message`

***

### stack?

> `optional` **stack?**: `string`

#### Inherited from

`Error.stack`

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

`Error.captureStackTrace`
