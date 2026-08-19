[@okta/auth-foundation](../..) / [TokenOrchestrator](../index.md) / [TokenOrchestrator](../index.md) / Events

# Interface: Events

Map of events fired from [TokenOrchestrator.emitter](../index.md#emitter)

## Example

```ts
// key = Event name
// value = Event Type
client.emitter.on('error', ({ error }) => {
  console.log(error);
});
```

## Properties

### error

> **error**: `object`

| Name | Type |
| ------ | ------ |
| `error` | [`JsonRecord`](../../Core/type-aliases/JsonRecord.md) \| [`Error`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error) |
| `type?` | `string` |
