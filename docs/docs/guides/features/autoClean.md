---
id: "autoClean"
title: "Feature: autoClean"
sidebar_label: "autoClean"
custom_edit_url: null
---

`autoClean` is a feature of `@okta/spa-credential-manager` designed to assist in keeping storage locations clean by preventing the build up of expired tokens. When a [Token](../../api/auth-foundation/AuthFoundation/classes/Token) is stored via [Credential.store()](../../api/spa-platform/classes/Credential#store), the `autoClean` feature will scan storage for any previously stored tokens and automatically remove any which match the following criteria:
  1. The previously stored token matches the same scopes as the to-be stored token
  2. _(configurable)_ The previously stored token is expired (determined by a timestamp comparison)
  3. _(configurable)_ The previously stored token matches the same tags as the to-be stored token

### Example

```ts
// default autoClean configuration
Credential.init({
  autoClean: true,          // enables autoClean feature (on by default)
  autoCleanOpts: {
    suppressEvents: true,
    expiredOnly: true,
    matchTags: true,
  }
});
```

### Configurations

