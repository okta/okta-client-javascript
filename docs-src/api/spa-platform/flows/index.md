[@okta/spa-platform](..) / Flows

# Flows

Includes extensions of OAuth2 flows designed for a browser environment. Performing oauth2 flows sometimes referred 
to as "front-channel"; The web application itself is requesting tokens from the authorization server.

> [!IMPORTANT]
> These exports are **NOT** available from the default export.
>
> Use `import from '@okta/spa-platform/flows'`.

## Remarks

Theses exports depend on `@okta/oauth2-flows`. In order to mark `@okta/oauth2-flows` as an optional dependency,
these exports are kept separate from the default export.

## See

[SPA Platform: Entry Points](/api/spa-platform/#entry-points)

## Classes

| Class | Description |
| ------ | ------ |
| [AuthorizationCodeFlow](AuthorizationCodeFlow/index.md) | Browser-specific additions to [AuthorizationCodeFlow](/api/oauth2-flows/AuthorizationCodeFlow/) |
| [SessionLogoutFlow](SessionLogoutFlow/index.md) | Browser-specific additions to [SessionLogoutFlow](/api/oauth2-flows/SessionLogoutFlow/) to perform OIDC logout |

## Namespaces

| Namespace | Description |
| ------ | ------ |
| [AuthorizationCodeFlow](AuthorizationCodeFlow/index.md) | Browser-specific additions to [AuthorizationCodeFlow](/api/oauth2-flows/AuthorizationCodeFlow/) |
| [SessionLogoutFlow](SessionLogoutFlow/index.md) | Browser-specific additions to [SessionLogoutFlow](/api/oauth2-flows/SessionLogoutFlow/) to perform OIDC logout |
