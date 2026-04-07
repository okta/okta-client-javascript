# @okta/oauth2-flows

**Package**: `@okta/oauth2-flows`  
**Version**: 0.6.0  
**Type**: Token Acquisition Library  
**Purpose**: Implementations of OAuth2 authentication flows for browser/SPA environments.

> 📌 **Context**: This package implements OAuth2 flows using primitives from `@okta/auth-foundation`. See [root claude.md](../../claude.md) for monorepo architecture.

## 🎯 Package Overview

This package provides production-ready implementations of OAuth2 authentication and logout flows, designed in a environment-agnostic way.

### What This Package Provides

- **Authorization Code Flow**: Full implementation with PKCE support
- **Logout Flows**: Session logout and token revocation
- **Redirect Handling**: Parse OAuth2 redirect callbacks
- **Authentication Transactions**: Stateful authentication flow management
- **DPoP Support**: Demonstrating Proof-of-Possession for enhanced security

### What This Package Does NOT Provide

- Token storage/management (see `@okta/spa-platform`)
- Token lifecycle management (renewal, etc.)
- Environment specific implementation details
- Making authenticated API requests

## 📁 Source Code Structure

```
src/
├── AuthorizationCodeFlow/   # Authorization Code Flow implementation
│   ├── AuthorizationCodeFlow.ts
│   ├── AuthorizationCodeFlowOptions.ts
│   └── (related utilities)
├── SessionLogoutFlow/       # Session logout implementation
│   ├── SessionLogoutFlow.ts
│   └── (related utilities)
├── AuthenticationFlow.ts    # Base authentication flow abstraction
├── AuthTransaction.ts       # Authentication transaction state
├── LogoutFlow.ts            # Base logout flow abstraction
├── types.ts                 # TypeScript type definitions
└── index.ts                 # Public API exports
```

## 📦 Package Exports

```typescript
import { AuthorizationCodeFlow, SessionLogoutFlow } from '@okta/oauth2-flows';
```

**Main exports**:
- `AuthorizationCodeFlow` - Authorization Code Flow with PKCE
- `SessionLogoutFlow` - Logout flow implementation
- `AuthenticationFlow` - Base class for authentication flows
- `AuthTransaction` - Transaction state management
- Related types and interfaces

## 🔑 Key Components

### 1. AuthorizationCodeFlow

Implements the OAuth2 Authorization Code Flow with PKCE.

**Usage Pattern**:
```typescript
import { AuthorizationCodeFlow } from '@okta/oauth2-flows';
import { FetchClient } from '@okta/auth-foundation';

const flow = new AuthorizationCodeFlow({
  issuer: 'https://dev-123456.okta.com/oauth2/default',
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:8080/login/callback',
  scopes: ['openid', 'profile', 'email'],
});

// Start authentication
const { url, codeVerifier, state } = await flow.start();
// Store codeVerifier and state for callback handling
window.location.href = url; // Redirect to Okta

// Handle callback (after redirect back)
const tokens = await flow.handleCallback({
  code: '...',          // from URL params
  state: '...',         // from URL params
  codeVerifier: '...',  // retrieved from storage
});
```

**Features**:
- PKCE code challenge generation
- State parameter for CSRF protection
- Nonce for ID token validation
- DPoP support (optional)

**References:**
- Authorization Code Flow: https://datatracker.ietf.org/doc/html/rfc6749#section-4.1
- PKCE: https://datatracker.ietf.org/doc/html/rfc7636
- DPoP: https://datatracker.ietf.org/doc/html/rfc9449

### 2. SessionLogoutFlow

Implements OAuth2 logout functionality.

**Usage Pattern**:
```typescript
import { SessionLogoutFlow } from '@okta/oauth2-flows';

const logoutFlow = new SessionLogoutFlow({
  issuer: 'https://dev-123456.okta.com/oauth2/default',
  clientId: 'your-client-id',
  postLogoutRedirectUri: 'http://localhost:8080/logout',
});

// Start logout
const { url } = await logoutFlow.start({
  idToken: 'user-id-token', // Optional: for id_token_hint
});

window.location.href = url; // Redirect to logout endpoint
```

**References**
- RP-Initiated Logout: https://openid.net/specs/openid-connect-session-1_0-17.html

### 3. AuthTransaction

Manages the state of an authentication transaction across redirects.

**Responsibilities**:
- Track authentication progress
- Store flow-specific parameters (PKCE verifier, state, nonce)
- Handle transaction lifecycle

### 4. AuthenticationFlow (Base Class)

Abstract base class for all authentication flows.

**Purpose**:
- Defines common flow interface
- Provides shared flow utilities
- Enforces consistent patterns

## 🔧 Development

### Building
```bash
yarn build              # Build ESM + types
yarn build:watch        # Watch mode
yarn build:esm          # Rollup bundle only
yarn build:types        # TypeScript definitions only
```

### Testing
```bash
yarn test               # Run all tests
yarn test:unit          # Unit tests
yarn test:browser       # Browser environment tests
yarn test:node          # Node.js environment tests
yarn test:watch         # Watch mode
```

### Linting
```bash
yarn lint
```

## 🏗️ Architecture Patterns

### Flow Lifecycle

1. **Initialization**: Create flow instance with configuration
2. **Start**: Generate authorization URL with security parameters
3. **Redirect**: User redirected to Okta for authentication
4. **Callback**: Handle redirect back with authorization code
5. **Token Exchange**: Exchange code for tokens using stored verifier
6. **Complete**: Return tokens to caller

### Security Features

**PKCE (Proof Key for Code Exchange)**:
- Prevents authorization code interception
- Flow generates random `code_verifier`
- Sends `code_challenge` (SHA-256 hash) with auth request
- Sends `code_verifier` with token request
- Reference: https://datatracker.ietf.org/doc/html/rfc7636

**State Parameter**:
- CSRF protection
- Generated per-transaction
- Validated on callback

**Nonce**:
- Replay attack prevention for ID tokens
- Embedded in ID token claims
- Validated after token exchange

**DPoP (optional)**:
- Binds tokens to cryptographic key
- Prevents token theft/replay attacks
- Reference: https://datatracker.ietf.org/doc/html/rfc9449

### Dependency Injection

Flows depend on `@okta/auth-foundation` for:
- HTTP client (`FetchClient`)
- Token parsing and validation
- Cryptographic utilities
- OAuth2 protocol helpers

## 🧪 Testing Strategy

### Test Organization
Tests are located in `test/` and organized by component:
- Flow implementations
- Transaction state management
- Security parameter generation
- Error handling

### Browser vs Node Tests
- **Browser tests**: Focus on browser-specific APIs (URL parsing, redirect handling)
- **Node tests**: Focus on token exchange and API interactions

### Mocking Strategy
Uses `@repo/jest-helpers` to mock:
- HTTP responses from OAuth2 endpoints
- Browser APIs (location, localStorage)
- Crypto operations

## 🔗 Integration with Other Packages

### Dependencies
- `@okta/auth-foundation` (peer dependency): Core primitives

### Used By
- `@okta/spa-platform`: Higher-level platform SDK that wraps these flows with token management

### Typical Usage Context
```typescript
// In @okta/spa-platform or user application
import { AuthorizationCodeFlow } from '@okta/oauth2-flows';
import { FetchClient } from '@okta/auth-foundation';

// Flow handles authentication
// Platform SDK handles token storage/management
```

## 📘 Key Concepts

### OAuth2 Authorization Code Flow

**Standard Flow**:
1. Client redirects user to authorization server
2. User authenticates and consents
3. Authorization server redirects back with code
4. Client exchanges code for tokens

**With PKCE**:
- Adds code_verifier/code_challenge mechanism
- Required for public clients (SPAs)
- Prevents authorization code interception

### Redirect-Based Authentication

All flows in this package use browser redirects:
- User leaves your app temporarily
- Authenticates at Okta
- Returns to your app with authorization code
- App exchanges code for tokens

**State Management Challenge**: App must preserve state across redirects
- Store PKCE verifier before redirect
- Retrieve verifier on callback
- Validate state parameter matches

### DPoP Flow

When DPoP is enabled:
1. Client generates key pair
2. Creates DPoP proof (signed JWT)
3. Sends proof in `DPoP` header
4. Receives DPoP-bound token
5. Must use same key for subsequent requests

## 🚨 Common Gotchas

1. **DPoP Binding**: If using DPoP, same key must be used for all requests with that token
2. **No Token Management**: This package only acquires tokens - use `@okta/spa-platform` for management

## 🎯 Common Use Cases

### Standard SPA Login
```typescript
// 1. Start flow
const flow = new AuthorizationCodeFlow(config);
const url = await flow.start();

// 2. Store for later
const transaction = new AuthTransaction(flow.context);
await transaction.save();

// 3. Redirect
window.location.href = url;

// 4. Handle callback (in callback route)
const { token, context } = await signInFlow.resume(window.location.href);
```

### Logout
```typescript
const logoutFlow = new SessionLogoutFlow(config);
const { url } = await logoutFlow.start({ idToken });
window.location.href = url;
```

## 💡 Working with Claude

When modifying this package:

1. **Adding new flows**: Extend `AuthenticationFlow` or `LogoutFlow` base classes
2. **Security parameters**: Never skip PKCE, state, or nonce validation
3. **Browser APIs**: All code must work in browser environment
4. **Node APIs**: All code must work in NodeJS environment
5. **Error handling**: Use error types from `@okta/auth-foundation/errors`
6. **Testing**: Add tests for both happy path and error scenarios

### Important Files
- `src/AuthorizationCodeFlow/` - Main authentication flow
- `src/SessionLogoutFlow/` - Logout implementation
- `src/AuthTransaction.ts` - Transaction state management
- `package.json` - Peer dependencies on `@okta/auth-foundation`

### Related Documentation
- OAuth2 spec: https://oauth.net/2/
- PKCE spec: https://oauth.net/2/pkce/
- OpenID Connect: https://openid.net/connect/

---

**Peer Dependencies**: `@okta/auth-foundation@*`  
**Target Environment**: Browser (SPA)  
**Private**: Yes (not published separately)