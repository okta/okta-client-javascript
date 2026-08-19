[@okta/oauth2-flows](../..) / [AuthorizationCodeFlow](../index.md) / [AuthorizationCodeFlow](../index.md) / RedirectParams

# Type Alias: RedirectParams

> **RedirectParams** = `object`

Params needed when constructing an [AuthorizationCodeFlow](../index.md) from an existing [OAuth2Client](/api/auth-foundation)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-redirecturi"></a> `redirectUri` | `string` \| [`URL`](https://developer.mozilla.org/docs/Web/API/URL) | Where the Authorization Server should redirect back to once the user has authenticated |
| <a id="property-additionalparameters"></a> `additionalParameters?` | [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\> | Additional query parameters to include on every `/authorize` request made by this flow |
