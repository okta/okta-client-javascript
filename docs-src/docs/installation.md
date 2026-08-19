# Installation

## Versioning

The Okta Client JavaScript SDKs adhere to semantic versioning. All SDKs in the ecosystem are synchronized to share common major and minor version numbers. As a result, some packages may be released without any changes, simply to maintain version alignment. The patch version, however, will reflect updates specific to each individual package.

## Package Installation

> [!IMPORTANT]
> Please review the [Project Structure](./structure.md) before adding to your project.

#### Install `auth-foundation`
::: code-group

```sh [yarn]
yarn add @okta/auth-foundation
```

```sh [npm]
npm install @okta/auth-foundation
```

```sh [pnpm]
pnpm add @okta/auth-foundation
```

:::

#### Install a [Token Acquisition](/docs/structure#token-acquisition) library
::: code-group

```sh [yarn]
yarn add @okta/oauth2-flows
```

```sh [npm]
npm install @okta/oauth2-flows
```

```sh [pnpm]
pnpm add @okta/oauth2-flows
```

:::

### Install a [Platform](/docs/structure#tier-3) library
::: code-group

```sh [yarn]
yarn add @okta/spa-platform
```

```sh [npm]
npm install @okta/spa-platform
```

```sh [pnpm]
pnpm add @okta/spa-platform
```

:::

> [!IMPORTANT]
> No CDN distributions are available at this time

## Polyfills

These libraries are written for modern JavaScript environments, targeting MDN's [Baseline 2022](https://developer.mozilla.org/en-US/docs/Glossary/Baseline/Compatibility)
and [Node.js 20](https://nodejs.org/en/blog/announcements/v20-release-announce) feature sets. Most notably, they utilize the following APIs:

* [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
* [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

Polyfills may be required to support legacy browsers or other runtime environments.

Legacy browsers may also need to polyfill the following:
* [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
* [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
