[@okta/auth-foundation](../../..) / [utils/TaskBridge](../index.md) / [TaskBridge](../index.md) / HandlerMessage

# Type Alias: HandlerMessage\<M\>

> **HandlerMessage**\<`M`\> = \{ `status`: `"SUCCESS"`; `data`: `M`; `__v`: [`BridgeVersions`](BridgeVersions.md); \} \| \{ `status`: `"FAILED"`; `data`: `M`; `__v`: [`BridgeVersions`](BridgeVersions.md); \} \| \{ `status`: `"PENDING"`; `__v`: [`BridgeVersions`](BridgeVersions.md); \} \| \{ `status`: `"ABORTED"`; `__v`: [`BridgeVersions`](BridgeVersions.md); \}

The payload of a message sent from Subscriber to Requestor, indicating the process or result of a request

## Type Parameters

| Type Parameter |
| ------ |
| `M` *extends* `object` |
