# Consuming Tokens Within an Application
##### Bridging the gap between user credentials and your application code

## Overview

**D**on't-**R**epeat-**Y**ourself is a fundamental principle of software development. While attaching an `accessToken` to an outgoing HTTP request may be simple, there is effort involved in checking if the token is expired, refreshing it if it is, and certainly in acquiring the token in the first place.

The fact that tokens expire makes their validity a function of time. Therefore, caching a token to be used later can easily run into issues when the token becomes expired. It's recommended to check for the token's expiration before using it.

Rather than writing the same token retrieval and validity checks over and over again, it's best to use an abstraction.

## Introduction to the `TokenOrchestrator` abstract class {#introduction}

The [`TokenOrchestrator`](/api/auth-foundation/TokenOrchestrator/classes/TokenOrchestrator) abstract class aims to be the aforementioned abstraction. It provides a clear pattern for your application behaviors:

* How should new tokens be acquired?
* How should tokens be stored?
* How should stored token be retrieved?
* How should expired tokens be handled?

Abstracting these ubiquitous patterns enables the downstream [Token](/api/auth-foundation/Token/classes/Token) consumers to only concern themselves with _consuming_ the token.

This is best illustrated by an example:
```typescript
// `TokenOrchestrator` is an abstract class, use an implementation
const orchestrator = new TokenOrchestrator();
// `FetchClient` is available within the SDKs, see Guide page
const fetchClient = new FetchClient(orchestrator);

const response = await fetchClient.fetch('/api/messages');
const data = await response.json();

// Do something with data...
```

Making an authenticated HTTP request is that simple! The [`TokenOrchestrator`](/api/auth-foundation/TokenOrchestrator/classes/TokenOrchestrator) provides the [`FetchClient`](/api/spa-platform/FetchClient/classes/FetchClient) instance with a token to sign the outgoing request.

## Included Implementations {#implementations}
Okta Client JavaScript includes a few implementations of `TokenOrchestrator` to support most common use cases.

### Browsers {#impl-browsers}

#### Recommended

* `AuthorizationCodeFlowOrchestrator` – Implementation based on [OAuth2: Authorization Code Flow](https://developer.okta.com/blog/2018/04/10/oauth-authorization-code-grant-type).
  * Ideal for protecting Single-Page or standard web applications.

#### Advanced

* `HostOrchestrator` – Delegates all token requests from [`SubApp`](/api/spa-platform/TokenOrchestrators/namespaces/HostOrchestrator/classes/SubApp) (a [`TokenOrchestrator`](/api/auth-foundation/TokenOrchestrator/classes/TokenOrchestrator) implementation) to a centralized [`Host`](/api/spa-platform/TokenOrchestrators/namespaces/HostOrchestrator/classes/Host) (an abstract class).
  * Well suited for large-scale applications, especially those developed by multiple teams.

### Node.js {#impl-nodejs}

Coming Soon!

### React Native {#impl-react-native}

Coming Soon!

## Advanced: Writing your own `TokenOrchestrator` {#custom-tokenorchestrator}

// TODO:

## See Also

### `abstract class` [`TokenOrchestrator`](/api/auth-foundation/TokenOrchestrator/classes/TokenOrchestrator)
##### Bridging the gap between user credentials and your application code 
### `class` [`AuthorizationCodeFlowOrchestrator`](/api/spa-platform/TokenOrchestrators/classes/AuthorizationCodeFlowOrchestrator)
##### A `TokenOrchestrator` implementation based on Authorization Code Flow
### `class` [`HostOrchestrator`](/api/spa-platform/TokenOrchestrators/namespaces/HostOrchestrator)
##### A `TokenOrchestrator` implementation based on a host-delegation pattern
### `class` [`FetchClient`](/api/spa-platform/FetchClient/classes/FetchClient)
##### A `fetch` wrapper to make authorized requests