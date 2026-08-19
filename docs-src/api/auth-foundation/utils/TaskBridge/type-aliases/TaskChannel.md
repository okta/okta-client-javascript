[@okta/auth-foundation](../../..) / [utils/TaskBridge](../index.md) / [TaskBridge](../index.md) / TaskChannel

# Type Alias: TaskChannel\<M\>

> **TaskChannel**\<`M`\> = [`BroadcastChannelLike`](../../../Core/interfaces/BroadcastChannelLike.md)\<[`RequestorMessage`](RequestorMessage.md) \| [`HandlerMessage`](HandlerMessage.md)\<`M`\> & `object`\>

A channel created to communicate the results of a pending request (will be isolated to specific Subscriber and Requestor)

## Type Parameters

| Type Parameter |
| ------ |
| `M` *extends* `object` |
