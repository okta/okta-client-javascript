[@okta/oauth2-flows](../..) / [Core](../index.md) / AuthenticationFlowEvents

# Type Alias: AuthenticationFlowEvents

> **AuthenticationFlowEvents** = `object`

Events emitted by every [AuthenticationFlow](../AuthenticationFlow/index.md)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-flow_started"></a> `flow_started` | `void` | Emitted when [AuthenticationFlow.inProgress](../AuthenticationFlow/index.md#inprogress) transitions to `true` |
| <a id="property-flow_stopped"></a> `flow_stopped` | `void` | Emitted when [AuthenticationFlow.inProgress](../AuthenticationFlow/index.md#inprogress) transitions to `false` |
| <a id="property-flow_errored"></a> `flow_errored` | `object` | Emitted when a flow method throws; the underlying error is included as `error` |
| `flow_errored.error` | `unknown` | - |
