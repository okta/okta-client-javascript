#!/usr/bin/env bash
# React Native OIDC E2E Tests

This directory contains end-to-end tests for the React Native OIDC app using Detox and WebdriverIO with Jasmine framework.

## Setup

1. Install dependencies in the app:
```bash
cd ../apps/react-native-oidc
npm install
```

2. Build the app for testing:
```bash
npm run e2e:build
```

3. (Optional) Configure environment variables in `testenv` or `testenv.local` if needed for Okta credentials

## Running Tests

### iOS Simulator
```bash
# From the app directory
npm run e2e

# Or from the tests directory
wdio run detox.wdio.conf.js
```

### Android Emulator
```bash
npm run e2e:android
```

### Development Mode (with watch)
```bash
# From the tests directory
npm run dev
```

## Test Structure

```
e2e/tests/
├── detox/
│   ├── react-native-oidc/
│   │   └── oidc-auth.spec.js      # OIDC authentication flow tests
├── detox.wdio.conf.js            # Detox-specific WebdriverIO config
└── wdio.conf.js                  # Browser-based tests config (Chrome)
```

## Test Organization

Tests are organized by functionality:
- **Navigation**: Tab switching and screen transitions
- **Authentication Status**: Login state display and button presence
- **Credentials Screen**: Credential listing and empty states
- **Token Screen**: Token details and error handling
- **UI Elements**: Layout and component visibility
- **Error Handling**: Graceful degradation when data is missing
- **Tab Navigation Consistency**: State management across tabs
- **Loading States**: Async operation handling

## Adding testID/accessibilityLabel

For better test reliability, add `accessibilityLabel` props to your components:

```javascript
// In app/(tabs)/index.tsx
<Button 
  accessibilityLabel="Request Token"
  title="Request Token" 
  onPress={handleSignIn} 
/>

// In app/(tabs)/_layout.tsx
<Tabs.Screen
  name="index"
  options={{
    title: 'Login',
    tabBarAccessibilityLabel: 'Login',
  }}
/>
```

## Detox Configuration

The app's `.detoxrc.js` points to the shared `detox.wdio.conf.js` configuration which supports:
- iOS simulator testing
- Android emulator testing
- Customizable device types via environment variables

Environment variables:
- `DEVICE_NAME`: Simulator device (default: iPhone 15)
- `PLATFORM_VERSION`: iOS version (default: 17.2)
- `APP_PATH`: Path to built app binary
- `DETOX_CONFIG`: Configuration name

## CI/CD Integration

For CI environments, set `CI=true`:
```bash
CI=true npm run e2e
```

This enables:
- Headless mode
- Full logging
- JUnit XML report generation
