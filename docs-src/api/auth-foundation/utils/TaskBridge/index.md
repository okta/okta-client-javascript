[@okta/auth-foundation](../..) / TaskBridge

# Abstract Class: TaskBridge\<M, R\>

A bridge for passing messages between a `TaskHandler` and a `Requestor`. The `Requestor` is "asking" the `TaskHandler`
To perform a `Task` on it's behave. Loosely based on TCP

When a `TaskRequest` is received, a separate [TaskBridge.TaskChannel](type-aliases/TaskChannel.md) is created between the `Handler` and 
the `Requestor` to communicate the status of the specific `Task`. Once the `Task` has completed the response will 
be sent to the `Requestor` via the [TaskBridge.TaskChannel](type-aliases/TaskChannel.md) and the channel will be closed.

The `TaskHandler` will broadcast a heartbeat, indicating it's still alive, to all pending [TaskBridge.TaskChannel](type-aliases/TaskChannel.md)s.
If a `Requestor` does not receive a response or heartbeat within a `timeout` interval, a Timeout error is thrown

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `M` *extends* `object` | A TypeMap of message payload structure for `TaskRequests` |
| `R` *extends* `object` | A TypeMap of message payload structure for `TaskReponses` |

## Constructors

### Constructor

> **new TaskBridge**\<`M`, `R`\>(`name`): `TaskBridge`\<`M`, `R`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

`TaskBridge`\<`M`, `R`\>

## Properties

### heartbeatInterval

> **heartbeatInterval**: `number` = `1000`

***

### name

> **name**: `string`

## Accessors

### pending

#### Get Signature

> **get** **pending**(): `number`

Returns the number of pending tasks

##### Returns

`number`

## Methods

### createBridgeChannel()

> `abstract` `protected` **createBridgeChannel**(): [`BridgeChannel`](type-aliases/BridgeChannel.md)\<`M`\[keyof `M`\]\>

A "public" channel opened on a known key (`this.name`) to send/receive task requests

#### Returns

[`BridgeChannel`](type-aliases/BridgeChannel.md)\<`M`\[keyof `M`\]\>

#### Remarks

This has been written with an assumption there is one only TaskBridge listening on
this public channel and responding to messages. There is currently no "message handling arbitartion"

***

### createTaskChannel()

> `abstract` `protected` **createTaskChannel**\<`K`\>(`name`): [`TaskChannel`](type-aliases/TaskChannel.md)\<`R`\[`K`\]\>

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* `string` \| `number` \| `symbol` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

[`TaskChannel`](type-aliases/TaskChannel.md)\<`R`\[`K`\]\>

***

### onTick()

> `protected` **onTick**(): `void`

#### Returns

`void`

***

### pushMessage()

> `protected` **pushMessage**(`message`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `Task`\<`any`, `any`\> |

#### Returns

`void`

***

### clearMessage()

> `protected` **clearMessage**(`messageId`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `messageId` | `string` |

#### Returns

`void`

***

### send()

> **send**\<`K`\>(`message`, `options?`): `TaskResponse`\<`R`\[`K`\]\>

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* `string` \| `number` \| `symbol` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `M`\[`K`\] |
| `options` | `TaskOptions` |

#### Returns

`TaskResponse`\<`R`\[`K`\]\>

***

### subscribe()

> **subscribe**\<`K`\>(`handler`): `void`

#### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* `string` \| `number` \| `symbol` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handler` | `TaskHandler`\<`M`, `R`\> |

#### Returns

`void`

***

### close()

> **close**(): `void`

#### Returns

`void`

## Errors

| Class | Description |
| ------ | ------ |
| [TimeoutError](classes/TimeoutError.md) | - |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [TaskStatus](type-aliases/TaskStatus.md) | Possible `status` values indicating the process of an orchestrated request |
| [BridgeVersions](type-aliases/BridgeVersions.md) | - |
| [HandlerMessage](type-aliases/HandlerMessage.md) | The payload of a message sent from Subscriber to Requestor, indicating the process or result of a request |
| [RequestorMessage](type-aliases/RequestorMessage.md) | The payload of a message sent from Requestor to Subscriber to alter the outcome of a request (`CANCEL` for example) |
| [BridgeChannel](type-aliases/BridgeChannel.md) | A channel with the purpose of receiving a request from a Requestor |
| [TaskChannel](type-aliases/TaskChannel.md) | A channel created to communicate the results of a pending request (will be isolated to specific Subscriber and Requestor) |

## Variables

| Variable | Description |
| ------ | ------ |
| [BridgeVersion](variables/BridgeVersion.md) | - |
| [warnOnBusMessageMismatch](variables/warnOnBusMessageMismatch.md) | Toggles whether `console.warn` messages are broadcasted when bus messages are received with a mismatched BridgeVersion. Useful for debugging communication issues. |
