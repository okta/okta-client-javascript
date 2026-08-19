[@okta/react-native-platform](../..) / [Platform](../index.md) / openAuthSession

# Function: openAuthSession()

> **openAuthSession**(`url`, `redirectUri`, `options?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`BrowserSessionResult`](../../BrowserSession/types/type-aliases/BrowserSessionResult.md)\>

Opens an authorization flow in a native browser

Launches a native browser (Safari on iOS, Chrome/CustomTabsIntent on Android) with the provided URL.
Detects when the user completes the OAuth flow and returns to the app via the redirect URI.

# iOS Behavior
Uses native ASWebAuthenticationSession which handles the entire OAuth flow natively.
The session automatically intercepts OAuth redirects and returns control to the app.
No Linking listener is needed on iOS.

# Android Behavior
Uses a polyfill pattern combining CustomTabsIntent with Linking API.
Listens for deeplinks from the OAuth provider and races against browser dismissal.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `url` | `string` | The full OAuth authorization URL |
| `redirectUri` | `string` | The redirect URI scheme (e.g., 'com.example://callback') Used to detect when the OAuth flow is complete |
| `options` | `BrowserSessionOptions` | Configuration options for the browser session: - `ephemeralSession`: If true, uses an isolated session without shared cookies/auth (Safari on iOS, SHARE_STATE_OFF on Android). Defaults to false for convenience. |

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`BrowserSessionResult`](../../BrowserSession/types/type-aliases/BrowserSessionResult.md)\>

A promise that resolves with the result of the browser session
| Result | Description |
| ------ | ------ |
| `{ type: 'success', url: '...' }` | User completed OAuth, returned with callback URL |
| `{ type: 'cancel' }` | User closed the browser without completing flow |
| `{ type: 'dismiss' }` | Browser was dismissed programmatically |

## Throws

Error with code if the operation fails:
| Error | Description |
| ------ | ------ |
| `invalid_url` | The provided URL is malformed |
| `no_activity` (Android) | Current activity not available |
| `no_window` (iOS) | Key window not found |
| `browser_session_error` | Generic native error |
| `native_module_not_available` | Native module not loaded |

## Remarks

This feature is based on Expo's [`expo-web-browser`](https://docs.expo.dev/versions/latest/sdk/webbrowser/).
Their implementation is more complete and can be used instead.

## Example

```typescript
const redirectUri = 'com.example://callback';

try {
  const result = await openAuthSession(authUrl, redirectUri, { ephemeralSession: false });
  if (result.type === 'success') {
    console.log('OAuth successful, code in:', result.url);
  } else {
    console.log('User cancelled');
  }
} catch (err) {
  console.error('Failed to open browser session:', err);
}
```
