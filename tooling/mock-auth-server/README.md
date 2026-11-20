# @okta/mock-auth-server

A mock OAuth2 Authorization Server for the purposes of e2e testing. **NOT INTENDED FOR A PRODUCTION ENVIRONMENT**

## Requirements

- Node >= 22.18.0 (or >= 22.6.0 with `--experimental-strip-types` flag)

## Installation

```sh
yarn add -D @okta/mock-auth-server
```

## Running

TODO
```sh
yarn start
```

## Configurations

| Option | Details | Default Value |
| --- | --- | --- |
| `port` | Port the server runs on | `3030`
TODO
| `cert` | Path to CA to enable HTTPS. `false` enables `HTTP` | `false`
| `logDir` | Path to directory for execution logs | `''`


## Mocks

### Authorization Code Flow

TODO