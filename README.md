# Okta OAuth2 Client SDKs

> This SDK is currently in `beta` phase

API Documentation and Integration Guides: https://okta-client-js.netlify.app/


## Design Goals
Auth is hard. OAuth can be even harder; both to understand as well as implement. The goal of this ecosystem of SDKs is to enable developers to seemlessly integrate OAuth into their Web Apps without the need to comprehensively understand all the intricacies of the OAuth2 spec


## Package Overview

#### Foundational SDK
* `@okta/auth-foundation` -  Foundational library on which all other SDKs are built

#### Token Acquisition SDKs
  * `@okta/spa-oauth2-flows` - Implementations of OAuth2 flows designed for Browser-based environments (emphasising SPA-based architectures)
  * `@okta/direct-auth`- *COMING SOON!*
  * `@okta/spa-idx` - *COMING SOON!*

#### Token Management / Platform SDKs
  * `@okta/spa-platform` - Provides utilities for mangaging token lifecycles, storing tokens, synchronizing browser tabs, and requesting protected resources; designed for Browser-based environments (emphasising SPA-based architectures)


## Integrating the SDKs in your project

To install, run:

```bash
yarn add @okta/auth-foundation @okta/spa-oauth2-flows @okta/spa-platform
```

More integration guides can be found at https://okta-client-js.netlify.app/


## Getting Started (with this repo)

```bash
node --version    # should be >=20
yarn              # installs all required dependencies
yarn build        # builds all SDK libaries
```


## Samples

### Redirect Model
Implements Authorization Code Flow via Redirect Model

Located: `e2e/apps/redirect-model`

### Token Broker
Implements Authorization Code Flow via Redirect Model to obtain a "all-scoped" token. This token is used to request downscoped access tokens to be used for resource requests
