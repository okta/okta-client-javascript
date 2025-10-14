
### `URLSearchParams`

`URLSearchParams` is not fully implemented in RN. This caused the `TokenRequest` (which extends `OAuth2Request`) to fail to appened a post body since
an instance of `URLSearchParams` is passed directly to `fetch`/`Request`.

Possible solutions:
* (**Current**) when constructing a `Request` instance, use `URLSearchParams.toString()` directly

  ```javascript
  const request = new Request(url, { body: params.toString() });
  ```
  Rather than relying on `fetch`/`Request` to consume the `URLSearchParams` instance in the same way it's done in Browsers/NodeJS

* Polyfill ([react-native-url-polyfill](https://github.com/charpeni/react-native-url-polyfill)). This is purposely kept outside of RN to reduce the size of RN by default. It may be reasonable to include this in `react-native-platform` or require it as a peer dependency


### `WebCrypto`
`WebCrypto`, specifically `crypto.subtle` is not implemented in RN. There are many polyfills and such that seem to exist, but many of them seem abandoned.

* [`expo-crypto`](https://docs.expo.dev/versions/latest/sdk/crypto/) - the `expo` ecosystem is well documented and maintained, however this library does not include all of `WebCrypto`, it only includes `digest`, `randomBytes`, and `randomUUID`. An additional library would be required for `JWT` signing and validation for `importKey`, `exportKey`, `verify` and `sign`

* [`react-native-webview-crypto`](https://github.com/webview-crypto/react-native-webview-crypto) seems like a very grass-roots, community supported project (possibly risky since this is ultimately a crypto library), but how it works is interesting. It uses a hidden `WebView` and messages between the App and the `WebView` to utilize the `WebView` (aka browser's) `WebCrypto` methods/implementation. This might a good alternative to truly polyfilling crypto libraries

* [`react-native-app-auth`](https://github.com/FormidableLabs/react-native-app-auth/blob/main/packages/react-native-app-auth) provides simple android and ios modules for performing basic AuthCodeFlow and a JS wrapper that reaches out to the NativeModules. Maybe a similar pattern could be done for crypto (or atleast JWT methods, with combination of `expo-crypto`). https://github.com/zaguiini/react-native-pure-jwt maybe a good start as well