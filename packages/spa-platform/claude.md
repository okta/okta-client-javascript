# @okta/spa-platform

**Package**: `@okta/spa-platform`  
**Version**: 0.6.0  
**Type**: Platform/Management Library  
**Purpose**: High-level SPA platform SDK for token lifecycle management, storage, and authenticated requests.

> 📌 **Context**: This is the highest-level package in the monorepo, designed for direct use by SPA applications. See [root claude.md](../../claude.md) for monorepo architecture.

## 🎯 Package Overview

This package provides a complete, production-ready SDK for Single Page Applications to handle OAuth2 authentication, token management, and authenticated API requests.

### What This Package Provides

- **Credential Management**: High-level `Credential` abstraction for tokens with automatic refresh
- **Token Orchestrators**: Specialized orchestrators for different authentication patterns
  - `AuthorizationCodeFlowOrchestrator` - Standard SPA authentication flow
  - `HostOrchestrator` - Multi-app/iframe token delegation architecture
- **Browser Token Storage**: `BrowserTokenStorage` for secure token persistence
- **OAuth2 Client**: Browser-specific OAuth2 client with tab synchronization
- **Authenticated FetchClient**: HTTP client with automatic token injection
- **Flow Wrappers**: Browser-optimized versions of `@okta/oauth2-flows`
- **DPoP Support**: Browser-specific DPoP key management and signing

### What This Package Does NOT Provide

- Server-side authentication (this is SPA-only)
- Native mobile app support
- OAuth2 flow implementations (delegates to `@okta/oauth2-flows`)

## 📁 Source Code Structure

```
src/
├── Credential/              # Credential management and abstractions
├── FetchClient/             # HTTP client with token injection
├── flows/                   # Flow integrations (wrapping @okta/oauth2-flows)
├── orchestrators/           # Token lifecycle orchestrators
├── platform/                # Browser-specific platform utilities
├── utils/                   # Utility functions
└── index.ts                 # Public API exports
```

## 📦 Package Exports

```typescript
import { /* platform APIs */ } from '@okta/spa-platform';
```

**Main exports**:
- Credential managers
- Authenticated fetch client
- Token orchestrators
- Browser-specific utilities
- Integrated flow wrappers

## 🔑 Key Components

### 1. Credential (`Credential/Credential.ts`)

High-level abstraction representing an OAuth2 credential (token + metadata).

**Key Features**:
- Wraps a `Token` with lifecycle management
- Automatic refresh via `refreshIfNeeded()`
- Static methods for finding and storing credentials
- Integration with `BrowserTokenStorage`

**Usage**:
```typescript
import { Credential } from '@okta/spa-platform';

// Store a credential
const credential = await Credential.store(token, ['app:main']);

// Find credentials by filter
const credentials = await Credential.find((meta) => 
  meta.scopes?.includes('profile')
);

// Refresh if needed (checks expiration automatically)
await credential.refreshIfNeeded();

// Access the token
const accessToken = credential.token.accessToken;

// Remove credential
await credential.remove();
```

### 2. AuthorizationCodeFlowOrchestrator (`orchestrators/AuthorizationCodeFlowOrchestrator.ts`)

Implements `TokenOrchestrator` for standard SPA authentication flows.

**Responsibilities**:
- Manage authentication flow lifecycle
- Store and retrieve credentials
- Handle redirects and callbacks
- Automatic token refresh
- Event emission for UI integration

**Usage**:
```typescript
import { 
  AuthorizationCodeFlowOrchestrator,
  AuthorizationCodeFlow 
} from '@okta/spa-platform';

// Create flow
const flow = new AuthorizationCodeFlow({
  issuer: 'https://dev-123456.okta.com/oauth2/default',
  clientId: 'your-client-id',
  redirectUri: 'http://localhost:8080/callback',
  scopes: ['openid', 'profile', 'offline_access'],
});

// Create orchestrator
const orchestrator = new AuthorizationCodeFlowOrchestrator(flow, {
  avoidPrompting: false,
  emitBeforeRedirect: true,
  getOriginalUri: () => window.location.pathname,
  tags: ['main-app'],
});

// Listen for events
orchestrator.on('login_prompt_required', ({ done, params }) => {
  console.log('Login required', params);
  done(); // Call when ready to proceed
});

orchestrator.on('error', ({ error }) => {
  console.error('Auth error', error);
});

// Get token (will redirect if not authenticated)
const token = await orchestrator.getToken({
  scopes: ['openid', 'profile'],
});

// Resume flow after redirect callback
await orchestrator.resumeFlow(window.location.href);
```

### 3. HostOrchestrator (`orchestrators/HostOrchestrator/`)

Advanced multi-app architecture for token delegation between host app and sub-apps (e.g., iframes).

**Components**:
- `HostOrchestrator.Host` - Receives and fulfills token requests from sub-apps
- `HostOrchestrator.SubApp` - Delegates token requests to host
- `HostOrchestrator.ProxyHost` - Adapts any orchestrator into a host

**Use Cases**:
- Micro-frontend architectures
- Main app + embedded iframes
- Shared authentication across multiple SPAs

**Usage - Host App**:
```typescript
import { 
  HostOrchestrator,
  AuthorizationCodeFlowOrchestrator,
  AuthorizationCodeFlow
} from '@okta/spa-platform';

// Create standard orchestrator
const flow = new AuthorizationCodeFlow({ /* config */ });
const orchestrator = new AuthorizationCodeFlowOrchestrator(flow);

// Wrap in ProxyHost to enable delegation
const host = new HostOrchestrator.ProxyHost('main-app', orchestrator);

// Host automatically handles token requests from sub-apps
```

**Usage - Sub-App (iframe)**:
```typescript
import { HostOrchestrator } from '@okta/spa-platform';

// Create SubApp orchestrator that delegates to host
const subApp = new HostOrchestrator.SubApp({
  scopes: ['openid', 'profile'],
  targetOrigin: 'https://main-app.example.com',
});

// Use like any orchestrator
const token = await subApp.getToken();
```

### 4. BrowserTokenStorage (`Credential/TokenStorage.ts`)

Browser-specific token storage implementation.

**Features**:
- Supports `localStorage` and `sessionStorage`
- Automatic serialization/deserialization
- Tab-synchronized updates
- Secure storage practices
- Encrypts tokens at-rest

### 5. OAuth2Client (`platform/OAuth2Client.ts`)

Browser-specific OAuth2 client extending `@okta/auth-foundation` client.

**Key Feature**:
- **Tab-Synchronized Refresh**: Uses `SynchronizedResult` to coordinate token refresh across browser tabs
- Only one tab performs refresh, others wait for result
- Prevents duplicate refresh requests

**How It Works**:
```typescript
// Multiple tabs call refresh simultaneously
// Only one actually makes the request
// Others receive the result via storage events
const refreshedToken = await client.refresh(token);
```

### 6. FetchClient (`FetchClient/`)

Authenticated HTTP client for making API requests.

**Features**:
- Automatic access token injection in `Authorization` header
- DPoP proof generation (if token is DPoP-bound)
- Token refresh on 401 responses
- Platform-specific fetch implementation

**Usage**:
```typescript
import {
  FetchClient,
  Credential,
  AuthorizationCodeFlowOrchestrator,
  AuthorizationCodeFlow
} from '@okta/spa-platform';

// Create standard orchestrator
const flow = new AuthorizationCodeFlow({ /* config */ });
const orchestrator = new AuthorizationCodeFlowOrchestrator(flow);

const client = new FetchClient(orchestrator);

// Automatically adds Authorization header
const response = await client.fetch('https://api.example.com/data');
const data = await response.json();
```

### 7. Flow Wrappers (`flows/`)

Browser-optimized versions of `@okta/oauth2-flows`:
- `AuthorizationCodeFlow` - Extends base flow with browser storage integration
- `SessionLogoutFlow` - Extends base logout with browser cleanup

These wrap the core flows and add browser-specific functionality like:
- Automatic state/verifier storage in sessionStorage
- Callback parsing from `window.location`
- Browser redirect handling


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
yarn test:watch         # Watch mode
```

### Linting
```bash
yarn lint
```

## 🏗️ Architecture Patterns

### Layered Architecture

```
┌─────────────────────────────────────┐
│   SPA Application Code              │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   @okta/spa-platform                │
│   • Token Orchestration             │
│   • Storage Management              │
│   • Tab Synchronization             │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   @okta/oauth2-flows                │
│   • Authorization Code Flow         │
│   • Logout Flows                    │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   @okta/auth-foundation             │
│   • Token Primitives                │
│   • HTTP Client                     │
│   • Crypto Utils                    │
└─────────────────────────────────────┘
```

### Credential-Based Architecture

This package uses a **Credential** abstraction rather than raw tokens:

```
Application Code
      ↓
Credential (high-level)
      ↓
Token (from @okta/auth-foundation)
      ↓
OAuth2 protocol primitives
```

**Benefits**:
- Automatic refresh management
- Storage abstraction
- Metadata (scopes, tags) attached to tokens
- Query/filter capabilities

### Orchestrator Pattern

`TokenOrchestrator` (from `@okta/auth-foundation`) defines the contract:
- `getToken(params)` - Get or request a token
- Event emission for lifecycle hooks

This package provides implementations:
- `AuthorizationCodeFlowOrchestrator` - Standard SPA flow
- `HostOrchestrator.Host` - Token delegation receiver
- `HostOrchestrator.SubApp` - Token delegation requestor

### Tab Synchronization

**Challenge**: Multiple browser tabs need consistent auth state

**Solution**: 
- `BrowserTokenStorage` uses storage events
- `SynchronizedResult` prevents duplicate operations
- `OAuth2Client.prepareRefreshRequest` coordinates refresh across tabs

**Flow**:
1. Tab A starts token refresh
2. Tab A creates `SynchronizedResult` with unique key
3. Tab A stores "pending" state in localStorage
4. Tab B attempts refresh with same key
5. Tab B sees "pending", waits for result
6. Tab A completes, stores result
7. Tab B receives result via storage event

## 🧪 Testing Strategy

### Test Organization
Tests are co-located in `test/` and focus on:
- Token renewal logic
- Tab synchronization
- Storage operations
- HTTP client behavior
- Error handling

### Browser Environment
All tests simulate browser environment:
- Mock `localStorage` and `sessionStorage`
- Mock `BroadcastChannel`
- Mock `fetch` API

### Mocking Strategy
Uses `@repo/jest-helpers` to mock:
- Browser storage APIs
- Token endpoints
- Time (for expiration testing)

## 🔗 Integration with Other Packages

### Dependencies
- `@okta/auth-foundation` (peer dependency): Core primitives
- `@okta/oauth2-flows` (optional peer dependency): OAuth2 flows

### Typical Usage
```typescript
import {
  FetchClient,
  Credential,
  AuthorizationCodeFlowOrchestrator,
  AuthorizationCodeFlow
} from '@okta/spa-platform';

// Create standard orchestrator
const flow = new AuthorizationCodeFlow({ /* config */ });
const orchestrator = new AuthorizationCodeFlowOrchestrator(flow);

const client = new FetchClient(orchestrator);

// Automatically adds Authorization header
const response = await client.fetch('https://api.example.com/data');
const data = await response.json();
```

## 📘 Key Concepts

### Token Renewal

**Why?**
- Access tokens are short-lived (typically 1 hour)
- Must be renewed before expiry to avoid interruptions

**How?**
- Orchestrator checks expiration periodically
- Uses refresh token to get new access token
- Updates storage atomically
- Notifies all tabs of new tokens

### Cross-Tab Authentication

**Challenges**:
- User might authenticate in Tab A
- Tab B needs to know about authentication
- User might logout in Tab A
- Tab B should also logout

**Solution**:
- Tab sync via storage events or BroadcastChannel
- Shared token storage
- Coordinated logout

### Secure Token Storage

**Best Practices**:
1. **Never store tokens in cookies** (CSRF risk)
2. **Encrypt at rest** (XSS protection)
3. **Use localStorage** only if persistence is required
4. **Never log tokens** (security risk)
5. **Clear storage on logout**

### DPoP in SPA Context

**DPoP with SPAs**:
- Private key must be stored securely
- Use Web Crypto API for key generation
- Store (non-extractable) key in IndexedDB (not localStorage)
- Same key must be used for token and API requests

## 🚨 Common Gotchas

1. **Storage Permissions**: Some browsers block storage in iframes or incognito mode
2. **Token Expiry**: Orchestrator must start BEFORE tokens expire
3. **Tab Sync Delay**: Storage events have slight delay - don't rely on instant sync
4. **Memory Leaks**: Always call `orchestrator.stop()` when component unmounts
5. **DPoP Keys**: Must persist DPoP keys across page reloads (use IndexedDB)

## 🎯 Common Use Cases

### Basic SPA Authentication
```typescript
import { 
  AuthorizationCodeFlowOrchestrator,
  AuthorizationCodeFlow,
  Credential
} from '@okta/spa-platform';

// 1. Setup
const flow = new AuthorizationCodeFlow({
  issuer: 'https://dev-123456.okta.com/oauth2/default',
  clientId: 'client-id',
  redirectUri: 'http://localhost:8080/callback',
  scopes: ['openid', 'profile', 'offline_access'],
});

const orchestrator = new AuthorizationCodeFlowOrchestrator(flow);

// 2. Check if already authenticated
const token = await orchestrator.getToken();
// If not authenticated, this redirects to Okta

// 3. Handle callback (in /callback route)
if (window.location.pathname === '/callback') {
  await orchestrator.resumeFlow();
  // Redirect to originalUri or home
}

// 4. Make API requests
const credential = (await Credential.find(() => true))[0];
await credential.refreshIfNeeded();
const accessToken = credential.token.accessToken;
```

### Logout
```typescript
import { SessionLogoutFlow } from '@okta/oauth2-flows';

// Logout from Okta
const logoutFlow = new SessionLogoutFlow(config);
const credential = await Credential.getDefault();
const url = await logoutFlow.start(credential.token?.idToken);
window.location.href = url;
```

### Multi-App Architecture
```typescript
// Host App (main-app.example.com)
import { 
  HostOrchestrator,
  AuthorizationCodeFlowOrchestrator,
  AuthorizationCodeFlow
} from '@okta/spa-platform';

const flow = new AuthorizationCodeFlow({ /* config */ });
const orchestrator = new AuthorizationCodeFlowOrchestrator(flow);
const host = new HostOrchestrator.ProxyHost('main', orchestrator);

// Sub-App (iframe in main app)
import { HostOrchestrator } from '@okta/spa-platform';

const subApp = new HostOrchestrator.SubApp({
  scopes: ['openid', 'profile'],
  targetOrigin: 'https://main-app.example.com',
});

const token = await subApp.getToken(); // Requests from host
```

## 💡 Working with Claude

When modifying this package:

1. **Browser-Only**: All code must work in browser environment
2. **Storage Access**: Always handle storage errors gracefully (incognito, permissions)
3. **Tab Sync**: Test with multiple tabs/windows open
4. **Token Security**: Never log or expose tokens
5. **Orchestrator Lifecycle**: Always clean up (call `stop()`) to prevent memory leaks

### Important Files
- `src/Credential/` - Credential abstraction and storage
- `src/orchestrators/` - Token orchestrators
- `src/flows/` - Browser-specific flow wrappers
- `src/platform/OAuth2Client.ts` - Tab-synchronized refresh
- `src/index.ts` - Public API surface

### Related Documentation
- OAuth2 Token Refresh: https://oauth.net/2/refresh-tokens/
- Web Storage API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- BroadcastChannel API: https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel

---

**Peer Dependencies**:  
- `@okta/auth-foundation@*` (required)
- `@okta/oauth2-flows@*` (optional)

**Target Environment**: Browser (SPA only)  
**Private**: Yes (not published separately)