# Project Structure

The Okta Client JavaScript ecosystem consists of multiple libraries, each focusing on a specific area or API. There are four tiers of libraries:

#### Platform Agnostic

1. [__Foundational__](#tier-1): Foundational libraries upon which other libraries are built.
2. [__Token Acquisition & API Clients__](#tier-2): Libraries for interacting with spec-compliant OAuth2 Authorization Servers and other Okta REST APIs.

#### Platform Specific

3. [__Platform__](#tier-3): Libraries that build upon and extend tier 1 and 2 libraries, targeting specific platforms like browsers or Node.js.
4. [__Framework__](#tier-4): Libraries built for specific frameworks (such as React, Angular, or Express) to facilitate integration with the Okta Client ecosystem.

## Tier 1: Foundation Libraries {#tier-1}

* [`@okta/auth-foundation`](/api/auth-foundation/) – Defines foundational classes and interfaces. All other libraries within the project will have a dependency on `auth-foundation`.

<!-- ##### Coming Soon
* `@okta/passkey-foundation` – TBT -->

## Tier 2: Token Acquisition Libraries & API Clients {#tier-2}

#### Token Acquisition

* [`@okta/oauth2-flows`](/api/oauth2-flows/) – Implementations of OAuth2 authentication flows, such as Authorization Code Flow.

<!-- ##### Coming Soon

* `@okta/okta-direct-auth` – TBT
* `@okta/okta-idx` – TBT -->

#### API Clients – Coming Soon

* `@okta/myaccount-client` – (TBT) `APIClient` for the [Okta MyAccount](https://developer.okta.com/docs/reference/api/myaccount/) API

## Tier 3: Platform Libraries {#tier-3}

#### Browser

* [`@okta/spa-platform`](/api/spa-platform/) – Platform implementations and extensions for browser environments.
* [`@okta/react-native-platform`](/api/react-native-platform/) – Platform implementations and extensions for React Native environments.
* `@okta/nodejs-platform` - COMING SOON

## Tier 4: Framework Libraries {#tier-4}

#### Browser – Coming Soon

* [`@okta/okta-react`](https://github.com/okta/okta-react) (New Integration)
* [`@okta/okta-angular`](https://github.com/okta/okta-angular) (New Integration)
* [`@okta/okta-vue`](https://github.com/okta/okta-vue) (New Integration)
