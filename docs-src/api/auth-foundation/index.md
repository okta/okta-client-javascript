# @okta/auth-foundation

Foundational library for the Okta Client JavaScript ecosystem. Contains base classes and interfaces as well as default implementations.

It's very unlikely Application developers will want to use this library directly. Instead reach for Platform library like `@okta/spa-platform` or `@okta/react-native-platform`. All Platform libraries re-export the contents of this library (and made platform-specific overrides as needed)

Many default interface implementations provided in this library are in-memory based and are not suitable for production use. These implementions are replaced automatically in Platform libraries.

Complete documentation at TODO

## Requirements

This library depends on the [`WebCrypto API`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) which is supported by modern browsers and NodeJS 20+

## Installation

```sh
yarn add @okta/auth-foundation
```
