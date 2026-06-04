#!/usr/bin/env bash
# React Native OIDC E2E Tests

This app's Detox tests have been moved to the shared test infrastructure at `e2e/tests/detox/react-native-oidc/`.

## Quick Start

### Build and Test

```bash
# Build the app for e2e testing
npm run e2e:build

# Run tests on iOS simulator
npm run e2e

# Run tests on Android emulator
npm run e2e:android
```

## For Development

### Adding Test Cases

Add new test specs to: `../../tests/detox/react-native-oidc/openAuthenticatedSessions.spec.js`

Tests are written in Jasmine with WebdriverIO + Detox service for element interaction.

### Test Selectors

Tests use `accessibilityLabel` for element selection:
- `$('~Label')` - Select by accessibility label
- `$('**/XCUIElementTypeStaticText[`label CONTAINS "text"`]')` - XPath selectors

To make elements testable, add `accessibilityLabel`:

```javascript
<Button 
  accessibilityLabel="Request Token"
  title="Request Token" 
  onPress={handleSignIn} 
/>
```

## Running Tests from App Directory

```bash
# Run all Detox tests
npm run e2e

# Run tests for Android
npm run e2e:android

# Build framework cache
npm run e2e:build
```

## Running Tests from Tests Directory

```bash
cd ../../tests
npm run wdio -- run detox.wdio.conf.js
```

## Configuration

Test configuration is in: `../../tests/detox.wdio.conf.js`

App configuration is in: `.detoxrc.js`

See `../../tests/detox/README.md` for full documentation.
