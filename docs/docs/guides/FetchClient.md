# FetchClient
##### A `fetch` wrapper to make authorized requests

## Overview

The overwhelming majority of tokens are minted to make authenticated requests to resource servers. The [`FetchClient`](/api/spa-platform/FetchClient/classes/FetchClient) is a [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) wrapper to ease signing [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) instances with an `Authorization` header.

## Example

```typescript
const fetchClient = new FetchClient(orchestrator);

const response = await fetchClient.fetch('/api/messages');
const data = await response.json();

// Do something with data...
```

## Features

* `Bearer` token authorization
* [`DPoP`](https://datatracker.ietf.org/doc/html/rfc9449) token authorization (with `dpop-nonce` retry and caching)
* `insufficient_user_authentication` step-up authentication support
* `401` auto-retry
* `429` auto-retry with exponential backoff or `retry-after` header support

## Extensibility

To change the default behavior or add additional capabilities, simply extend the `FetchClient` class:

```typescript
export class MyFetchClient extends FetchClient {
  defaultHeaders = { 'foo': 'bar' };

  // Updates `429` retry delay to always be 1s
  protected getRetryDelay(response: Response, request: APIRequest): number {
    return 1000;
  }

  protected async processResponse(response: Response, request: APIRequest) {
    // Send analytics data to server
    await sendData(response);

    super.processResponse(response, request);
  }
}
```

## See Also

### `abstract class` [`APIClient`](/api/auth-foundation/Core/classes/APIClient)
### `abstract class` [`TokenOrchestrator`](/api/auth-foundation/TokenOrchestrator/classes/TokenOrchestrator)
##### Bridging the gap between user credentials and your application code