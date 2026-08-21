# @okta/react-native-platform

React Native platform bindings for the Okta Client JavaScript SDK. This package wires `@okta/auth-foundation` and `@okta/oauth2-flows` up to native iOS/Android capabilities:

- Launching an OAuth2/OIDC authorization flow in a native browser
- Persisting tokens in secure, platform-native storage (`TokenStorage`)
- Polyfilling [WebCrypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) API via `@okta/react-native-webcrypto-bridge`

> [!IMPORTANT]
> This library is in **beta**. It currently only supports in-browser Authorization Code flow

## Requirements

- React Native's [New Architecture](https://reactnative.dev/architecture/landing-page) (`newArchEnabled: true`) — native modules are implemented as TurboModules
- iOS 13.0+
- Android with a browser that supports [Custom Tabs](https://developer.chrome.com/docs/android/custom-tabs) (Chrome or equivalent) installed on-device
- Node >= 20.11.0
- Peer dependencies: `react`, `react-native`, `@okta/auth-foundation`
- Optional Peer dependencies: `@okta/oauth2-flows`

## Installation

```sh
yarn add @okta/react-native-platform @okta/auth-foundation
# optionally include @okta/oauth2-flows
```

iOS dependencies are linked via CocoaPods:

```sh
cd ios && pod install
```

Android is linked automatically through autolinking (`react-native.config.js`) — no extra step beyond a rebuild.

### Entry Points

```ts
// default: core + side effects (recommended)
import '@okta/react-native-platform'

// core: core functionality (no side effects)
import '@okta/react-native-platform/core'

// flows: OAuth2 flow implementations (requires `@okta/oauth2-flows`)
import '@okta/react-native-platform/flows'
```

(Recommended) Importing `@okta/react-native-platform` has the following side effects:

- Installs the WebCrypto polyfill (via `@okta/react-native-webcrypto-bridge`)
- Registers the `@okta/react-native-platform` Platform defaults
- Replaces `CredentialCoordinator.tokenStorage` with `ReactNativeTokenStorage`

All core exports are available via `@okta/react-native-platform/core` to avoid the side effects, if required. Although, the `core` export is unlikely to result in desired functionality out-of-the-box.

To perform OAuth2 flows (like Authorization Code flow) a peer dependency of `@okta/oauth2-flows` is required. All features dependent on `@okta/oauth2-flows` are exported from `@okta/react-native-platform/flows`, so `@okta/oauth2-flows` can be listed as a optional peer dependency

> All exports from `@okta/auth-foundation` and `@okta/oauth2-flows` are re-exported from `@okta/react-native-platform`. Always import from `@okta/react-native-platform` or a subpath

## Platform

### TokenStorage (`ReactNativeTokenStorage`)

This library includes a `TokenStorage` implementation (`ReactNativeTokenStorage`) backed by native secure storage. It is automatically referenced when using the default import

Tokens and their metadata are stored separately; Tokens are encrypted for greater security, where their associated metadata is stored separately to enable searching for tokens without decrypting (and therefore potentially prompting biometrics)

> Token metadata does not contain anything sensitive

**iOS** — both are stored as Keychain generic password items, in separate services, with different accessibility levels:

| Data | Service | Accessibility |
| --- | --- | --- |
| Tokens | `com.okta.auth-foundation.tokens` | `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` — requires the device to be unlocked, never leaves the device |
| Metadata | `com.okta.auth-foundation.metadata` | `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` — readable in the background after first unlock, survives reboots |

**Android** — both are stored in [Jetpack DataStore](https://developer.android.com/topic/libraries/architecture/datastore) preferences, in separate stores:

- Token values are encrypted with AES-256-GCM using a master key generated in the Android Keystore (hardware-backed when the device supports it).
- Metadata is stored unencrypted in its own `DataStore`.

## Authorization Code Flow

To perform Authorization Code flow within your React Native app, the following is required

### Configuration

#### Redirect URI / deep linking

> This is required to perform Authorization Code flow

Your app must be reachable at the `redirectUri` you pass to `AuthorizationCodeFlow` so the OS can hand control back to your app once the user finishes signing in.

**iOS** — register the URL scheme in `Info.plist` (or via `"scheme"` in `app.json`/`app.config.ts` if you're using Expo):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.example.app</string>
    </array>
  </dict>
</array>
```

No `Linking` listener is required on iOS — `ASWebAuthenticationSession` intercepts the redirect natively and resolves `openAuthSession` directly.

**Android** — add an intent filter for the redirect scheme/host to your launch activity in `AndroidManifest.xml`:

```xml
<activity android:name=".MainActivity" android:exported="true" ...>
  <intent-filter>
    <action android:name="android.intent.action.VIEW"/>
    <category android:name="android.intent.category.DEFAULT"/>
    <category android:name="android.intent.category.BROWSABLE"/>
    <data android:scheme="com.example.app" android:host="callback"/>
  </intent-filter>
</activity>
```

Android opens the authorization URL in a Custom Tab and relies on this intent filter plus React Native's `Linking` API to detect the redirect.

It's recommended to have a screen to render at the `redirectUri` path
```tsx
// app/callback.tsx
export default function CallbackScreen() {
  return (
    <>
      <ActivityIndicator size="large" />
      <Text>Signing in...</ThemedText>
    </>
  );
}
```

### Browser Prompt

The easiest way to perform an Authorization Code flow login is via `AuthorizationCodeFlow.PerformBrowserSignIn` which invokes `openAuthSession`

```ts
import { OAuth2Client, Credential } from '@okta/react-native-platform';
import { AuthorizationCodeFlow } from '@okta/react-native-platform/flows';

export const client = new OAuth2Client({ ... });

export const flow = new AuthorizationCodeFlow(client, {
  redirectUri: REDIRECT_URI
});

export async function performSignIn () {
  const result = await AuthorizationCodeFlow.PerformBrowserSignIn(flow);
  if (result.completed) {
    const { token } = result;
    const credential = await Credential.store(token);
    return credential;
  }

  return null;
}
```

#### `AuthorizationCodeFlow.PerformBrowserSignIn`

Opens a generated `/authorize` URL (via `AuthorizationCodeFlow.start()`) in a native browser (Safari via `ASWebAuthenticationSession` on iOS, Chrome/Custom Tabs on Android) and resolves once the flow completes.

```ts
AuthorizationCodeFlow.defaultBrowserSessionOptions = {
  ephemeralSession: true      // defaults to `true`
}
```

| Option | Details | Default Value |
| --- | --- | --- |
| `ephemeralSession` | Controls whether the browser session shares cookies/auth state with the user's normal browsing session (`false`) or runs isolated | `true`

## Testing

TODO - guidance about browser login difficult to test in e2e scenarios

## Samples

A complete Expo-based sample can be found at [`e2e/apps/react-native-oidc`](https://github.com/okta/okta-client-javascript/tree/master/e2e/apps/react-native-oidc)
