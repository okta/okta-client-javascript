[@okta/auth-foundation](../../..) / [OAuth2](../../index.md) / [OAuth2Request](../index.md) / RequestParams

# Interface: RequestParams

## Properties

### openIdConfiguration

> **openIdConfiguration**: [`OpenIdConfiguration`](../../interfaces/OpenIdConfiguration.md)

Reference to the OAuth2 Metadata document from the authorization server

***

### clientConfiguration

> **clientConfiguration**: [`Configuration`](../../classes/Configuration.md)

Configuration of the [OAuth2Client](../../OAuth2Client/index.md) being used to send the request

***

### clientAuthentication?

> `optional` **clientAuthentication?**: `any`

Authentication setting for the authorization server. Only relevant to Confidental Clients
