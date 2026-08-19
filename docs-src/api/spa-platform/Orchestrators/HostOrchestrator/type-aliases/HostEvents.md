[@okta/spa-platform](../../../..) / [Orchestrators](../../../index.md) / [HostOrchestrator](../index.md) / HostEvents

# Type Alias: HostEvents

> **HostEvents** = `object`

Map of events which can be emitted from [HostOrchestrator.emitter](../../../classes/HostOrchestrator.md#emitter)

## Properties

| Property | Type |
| ------ | ------ |
| <a id="property-duplicate_host"></a> `duplicate_host` | `object` |
| `duplicate_host.id` | `string` |
| `duplicate_host.duplicateId` | `string` |
| <a id="property-login_prompt_required"></a> `login_prompt_required` | [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `any`\> |
| <a id="property-request_received"></a> `request_received` | `object` |
| `request_received.request` | `RequestEvent`\[keyof `RequestEvent`\] |
| <a id="property-request_fulfilled"></a> `request_fulfilled` | `object` |
| `request_fulfilled.request` | `RequestEvent`\[keyof `RequestEvent`\] |
| `request_fulfilled.response` | `ResponseEvent`\[keyof `ResponseEvent`\] |
