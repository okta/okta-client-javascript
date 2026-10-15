# @repo/mock-resource-server

A standalone mock resource server used by e2e test apps. **NOT INTENDED FOR A PRODUCTION ENVIRONMENT**

## Requirements

- Node >= 22.18.0 (or >= 22.6.0 with `--experimental-strip-types`)

## Usage

As a Vite plugin (used by the e2e test apps during `vite dev`/`vite preview`):

```ts
import { mockResourceServerPlugin } from '@repo/mock-resource-server/vite-plugin';

export default defineConfig({
  plugins: [
    mockResourceServerPlugin({ port: 3333, auth: 'dpop' }),
  ],
});
```

The plugin starts the mock server in-process and proxies `/api/*` requests to it from the Vite dev/preview server.

Standalone, for ad-hoc manual testing:

```sh
node cli.ts --port 3333 --auth bearer
```

## Configuration

| Option | Details | Default |
| --- | --- | --- |
| `port` | Port the server runs on | `3333` |
| `auth` | Auth gating strategy: `dpop` \| `bearer` \| `none` | `bearer` |

## Mocks

### `GET /api/messages`

Returns a random list of fake messages. Pass `?acr=1` to simulate alternating `insufficient_user_authentication` 401 responses (step-up auth). The `redirect-model` app's `bearer` auth mode also supports a `?skip=1` suffix to bypass auth entirely.

### `GET /api/banking/*`

A preliminary mock banking API, backed by seeded (stable per server run) fake data:

- `GET /api/banking/profile`
- `GET /api/banking/accounts`
- `GET /api/banking/accounts/:id`
- `GET /api/banking/accounts/:id/transactions`
