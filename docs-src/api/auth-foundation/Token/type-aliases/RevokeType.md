[@okta/auth-foundation](../..) / [Token](../index.md) / [Token](../index.md) / RevokeType

# Type Alias: RevokeType

> **RevokeType** = `"ALL"` \| `"ACCESS"` \| `"REFRESH"`

Possible values provided to [OAuth2Client.revoke](../../OAuth2/OAuth2Client/index.md#revoke) to determine which tokens to revoke
* `'ALL'` - revokes both the `access_token` and `refresh_token`.
* `'ACCESS'` - revokes **only** the `access_token`.
* `'REFRESH'` - revokes **only** the `refresh_token`.
