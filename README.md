# Okta OAuth2 Client SDKs

> [!IMPORTANT]
> This SDK is currently in `beta` phase

Auth is hard. OAuth2 can be harder — both to understand and to implement correctly. This repo is a monorepo of interconnected JavaScript/TypeScript libraries that let you integrate OAuth2 into your app without needing to master the full spec yourself:

* **`@okta/auth-foundation`** — the foundational library (token handling, HTTP clients, platform abstractions) that every other package builds on
* **`@okta/oauth2-flows`** — environment-agnostic OAuth2 flow implementations (Authorization Code, Logout)
* **`@okta/spa-platform`** — token lifecycle management, storage, and tab synchronization for browser/SPA apps
* **`@okta/react-native-platform`** and **`@okta/react-native-webcrypto-bridge`** — React Native support, including a native WebCrypto bridge

**Full API documentation and integration guides:** https://okta.github.io/okta-client-javascript

## Contributing to this repo

### Prerequisites
* Node.js >= 20.11.0 (recommended: >= 22.13.1)
* Yarn >= 1.19.0

### Setup

```bash
node --version    # should be >=20
yarn               # installs all dependencies across the workspace
yarn build         # builds all SDK packages
```

### Common tasks

```bash
yarn build         # build all packages (via Turborepo)
yarn lint          # lint all packages
yarn test:unit     # run unit tests across all packages
yarn test:node     # run node-environment tests (excludes *-platform packages)
```

To work on a single package, `cd` into it under `packages/` and use its local scripts (e.g. `yarn test:watch`).

### Repo structure

```
packages/     the published SDKs (see above) plus internal dev tooling (mock-auth-server)
tooling/      shared build/lint/test config used across packages
e2e/          sample apps exercising the SDKs end-to-end
docs/         source for the documentation site
```
