[@okta/spa-platform](../../..) / [Flows](../../index.md) / [AuthorizationCodeFlow](../index.md) / Result

# Type Alias: Result

> **Result** = `object`

The result of successfully completing an Authorization Code flow via [AuthorizationCodeFlow.resume](/api/oauth2-flows)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-token"></a> `token` | [`Token`](/api/auth-foundation/Token/) | The exchanged [Token](/api/auth-foundation/Token/) |
| <a id="property-context"></a> `context` | [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `any`\> | The `stateData` originally passed to [AuthorizationCodeFlow.start](/api/oauth2-flows) |
