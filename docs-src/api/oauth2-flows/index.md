# @okta/oauth2-flows

Generic, platform-agnostic implementations of OAuth2 flows

It's very unlikely Application developers will want to use this library directly. Instead reach for Platform library like `@okta/spa-platform` or `@okta/react-native-platform`. All Platform libraries re-export the contents of this library via the `/flows` sub path (`@okta/spa-platform/flows`)

> NOTE: Flow classes will only exist in platform libraries if the flow makes sense in the corresponding environment

## Requirements

This library depends on the [`WebCrypto API`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) which is supported by modern browsers and NodeJS 20+

`@okta/auth-foundation` is a required peer dependency

## Installtion

```sh
yarn add @okta/auth-foundation @okta/oauth2-flows
```
