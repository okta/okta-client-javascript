# Token Broker Test App

This test app uses Authorization Code Flow to fetch an "all-scoped" token. This token is then used to request downscoped-tokens with specific scopes to make resource requests

## Okta App Requirements
* Applications > Applications > {App}
  * __PKCE__ required
  * __DPoP__ required
  * __Grant Types__: `Authorization Code` and `Refresh Token`
  * __Sign In Redirect URIs__: `http://localhost:8080/login/callback`
  * __Logout redirect URIs__: `http://localhost:8080/logout`
* Security > API > Trusted Origins
  * Entry for `http://localhost:8080`, Type: `CORS` and `Redirect`
* Security > Authorization Servers > `default` > Scopes
  * Add 3 new scopes: `test.scope.a`, `test.scope.b`, `test.scope.c`

## Local Machine
Add the following to your `/etc/hosts/ file

```bash
127.0.0.1 app.localhost
```


> Setting `?xdomain=1` in the URL of this app will enable cross-origin iframe token brokering
