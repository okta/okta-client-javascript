# React Native WebCrypto Bridge

This library is meant to provide a polyfill for the [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) in a React Native environment by performing the crypto operations at a Native level. You're welcome to consume this library for your own needs, however the main purpose of this library is to provide the required [WebCrypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) methods to support `@okta/react-native-platform`.

Feature requests against this library will not be accepted, however contributions will be.

## Current Support

| Method | Status | Notes |
| ------ | ------ | ------ |
| `getRandomValues()` | ✅ Implemented | |
| `randomUUID()` | ✅ Implemented | |
| `subtle.digest()` | ✅ Implemented | `SHA-256` only |
| `subtle.importKey()` | ✅ Implemented | `jwk` format only |
| `subtle.verify()` | ✅ Implemented | `RSASSA-PKCS1-v1_5` only |
| `subtle.exportKey()` | 🚧 Planned | Native bridge method exists; JS-side wiring not yet implemented (DPoP) |
| `subtle.sign()` | 🚧 Planned | Native bridge method exists; JS-side wiring not yet implemented (DPoP) |
| `subtle.generateKey()` | 🚧 Planned | Native bridge method exists; JS-side wiring not yet implemented (DPoP) |
| `subtle.encrypt()` | ❌ Not implemented | |
| `subtle.decrypt()` | ❌ Not implemented | |
| `subtle.deriveKey()` | ❌ Not implemented | |
| `subtle.deriveBits()` | ❌ Not implemented | |
| `subtle.wrapKey()` | ❌ Not implemented | |
| `subtle.unwrapKey()` | ❌ Not implemented | |

