[@okta/oauth2-flows](../..) / [SessionLogoutFlow](../index.md) / [SessionLogoutFlow](../index.md) / LogoutParams

# Type Alias: LogoutParams

> **LogoutParams** = `object`

Params needed when constructing a [SessionLogoutFlow](../index.md) from an existing [AuthFoundation!OAuth2Client](/api/auth-foundation)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-logoutredirecturi"></a> `logoutRedirectUri` | `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL) | Where the Authorization Server should redirect back to once logout completes |
| <a id="property-additionalparameters"></a> `additionalParameters?` | [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\> | Additional query parameters to include on the `/logout` request |
