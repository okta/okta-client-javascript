---
id: "installation"
title: "Installation"
sidebar_label: "Installation"
custom_edit_url: null
---

## Installation

```bash
yarn add @okta/auth-foundation @okta/spa-oauth2-flows @okta/spa-platform
```
OR
```bash
npm install @okta/auth-foundation @okta/spa-oauth2-flows @okta/spa-platform
```

## Polyfills

This library depends on the browser features and may require a polyfill to support legacy browsers

* [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
* [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
* [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
* [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
