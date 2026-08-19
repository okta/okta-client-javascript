[@okta/oauth2-flows](../..) / [AuthorizationCodeFlow](../index.md) / [AuthorizationCodeFlow](../index.md) / Result

# Type Alias: Result

> **Result** = `object`

The result of successfully completing an Authorization Code flow via [AuthorizationCodeFlow.resume](../index.md#resume)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-token"></a> `token` | [`Token`](/api/auth-foundation) | The exchanged [Token](/api/auth-foundation) |
| <a id="property-context"></a> `context` | [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `any`\> | The `stateData` originally passed to [AuthorizationCodeFlow.start](../index.md#start) |
