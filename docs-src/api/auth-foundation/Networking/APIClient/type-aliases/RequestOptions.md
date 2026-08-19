[@okta/auth-foundation](../../..) / [Networking](../../index.md) / [APIClient](../index.md) / RequestOptions

# Type Alias: RequestOptions

> **RequestOptions** = `object`

Options which control how an [APIClient](../index.md) sends a request.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="property-authorizerequest"></a> `authorizeRequest` | `boolean` \| ((`request`) => `boolean`) | Determines whether a [APIRequest](../../classes/APIRequest.md) should invoke [APIClient.authorize](../index.md#authorize) before sending. Defaults to `true` |
