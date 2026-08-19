[@okta/auth-foundation](../../..) / [utils/TaskBridge](../index.md) / [TaskBridge](../index.md) / TimeoutError

# Class: TimeoutError

## Extends

- [`AuthSdkError`](../../../Core/classes/AuthSdkError.md)

## Constructors

### Constructor

> **new TimeoutError**(...`args`): `TimeoutError`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | \[`string`, `ErrorOptions` & `object`\] |

#### Returns

`TimeoutError`

#### Overrides

[`AuthSdkError`](../../../Core/classes/AuthSdkError.md).[`constructor`](../../../Core/classes/AuthSdkError.md#constructor)

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

[`AuthSdkError`](../../../Core/classes/AuthSdkError.md).[`prepareStackTrace`](../../../Core/classes/AuthSdkError.md#preparestacktrace)

***

### stackTraceLimit

> `static` **stackTraceLimit**: `number`

#### Inherited from

[`AuthSdkError`](../../../Core/classes/AuthSdkError.md).[`stackTraceLimit`](../../../Core/classes/AuthSdkError.md#stacktracelimit)

***

### context

> **context**: [`JsonRecord`](../../../Core/type-aliases/JsonRecord.md) = `{}`

A dictionary to store the context in which the error was thrown
For example: The authentication context when an error is thrown during an authentication flow

#### Inherited from

[`AuthSdkError`](../../../Core/classes/AuthSdkError.md).[`context`](../../../Core/classes/AuthSdkError.md#context)

***

### cause?

> `optional` **cause?**: `unknown`

#### Inherited from

[`AuthSdkError`](../../../Core/classes/AuthSdkError.md).[`cause`](../../../Core/classes/AuthSdkError.md#cause)

***

### name

> **name**: `string`

#### Inherited from

[`AuthSdkError`](../../../Core/classes/AuthSdkError.md).[`name`](../../../Core/classes/AuthSdkError.md#name)

***

### message

> **message**: `string`

#### Inherited from

[`AuthSdkError`](../../../Core/classes/AuthSdkError.md).[`message`](../../../Core/classes/AuthSdkError.md#message)

***

### stack?

> `optional` **stack?**: `string`

#### Inherited from

[`AuthSdkError`](../../../Core/classes/AuthSdkError.md).[`stack`](../../../Core/classes/AuthSdkError.md#stack)

## Accessors

### timeout

#### Get Signature

> **get** **timeout**(): `boolean`

##### Returns

`boolean`

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

[`AuthSdkError`](../../../Core/classes/AuthSdkError.md).[`captureStackTrace`](../../../Core/classes/AuthSdkError.md#capturestacktrace)
