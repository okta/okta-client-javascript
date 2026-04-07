# @okta/auth-foundation

**Package**: `@okta/auth-foundation`  
**Version**: 0.6.0  
**Type**: Internal/Foundation Library  
**Purpose**: Core foundation library providing OAuth2 primitives, token handling, HTTP abstractions, and platform utilities.

> 📌 **Context**: This is the foundational package on which all other packages in this monorepo depend. Includes some default implementations of interfaces which are not intended for production use. See [root claude.md](../../claude.md) for monorepo architecture.

## 🎯 Package Overview

This package provides the building blocks for OAuth2 authentication and authorization. It is NOT designed to be used directly by end-users, but rather as a dependency for higher-level packages like `@okta/oauth2-flows` and `@okta/spa-platform`.

### What This Package Provides

- **OAuth2 Core Primitives**: Token structures, credential handling, OAuth2 protocol utilities
- **HTTP Client Abstraction**: Platform-agnostic HTTP client (FetchClient)
- **Token Management**: Token parsing, validation, refresh logic
- **Crypto Utilities**: PKCE, JWT operations, key generation
- **Platform Abstractions**: Browser/Node.js environment detection and utilities
- **Error Handling**: Standardized error types for OAuth2 flows

## 📁 Source Code Structure

```
src/
├── Credential/              # Credential/token credential abstractions
├── crypto/                  # Cryptographic utilities (PKCE, JWT, etc.)
├── errors/                  # Error classes and types
├── http/                    # HTTP client abstractions
├── jwt/                     # JWT parsing and validation
├── oauth2/                  # OAuth2 protocol utilities
├── platform/                # Service Locator dependency manager
├── types/                   # TypeScript type definitions
├── utils/                   # General utilities
├── FetchClient.ts           # HTTP client implementation
├── Token.ts                 # Token models and operations
├── TokenOrchestrator.ts     # Token lifecycle orchestration
├── core.ts                  # Core exports WITHOUT platform dependency implementations
├── index.ts                 # Public API exports WITH default platform dependency implementations
└── internal.ts              # Internal API exports (for other packages)
```

## 📦 Package Exports

### Public API (`@okta/auth-foundation`)
```typescript
import { /* public APIs */ } from '@okta/auth-foundation';
```

**Available paths**:
- `.` - Main exports (public API) WITH default platform dependency implementations
- `./core` - Core primitives WITHOUT platform dependency implementations
- `./internal` - Internal APIs (for use by `@okta/oauth2-flows`, `@okta/spa-platform`)

⚠️ **Note**: The `/internal` export is for use by other packages in this monorepo only. External consumers should NOT use this path.

## 🔑 Key Components

### 1. Token (`Token.ts`)
Represents OAuth2 tokens (access, ID, refresh).

**Responsibilities**:
- Parse and validate token structures
- Handle token expiration checks
- Extract claims from ID tokens (JWT)
- Token serialization/deserialization

### 2. FetchClient (`FetchClient.ts`)
Platform-agnostic HTTP client for making authenticated requests.

**Features**:
- DPoP (Demonstrating Proof-of-Possession) support
- Automatic retry logic
- Platform-specific fetch implementations (browser/Node.js)
- Request/response interceptors

### 3. TokenOrchestrator (`TokenOrchestrator.ts`)
Coordinates token lifecycle operations.

**Responsibilities**:
- Token refresh logic
- Token storage coordination
- Handling concurrent token requests

### 4. Cryptographic Utilities (`crypto/`)
Provides OAuth2-required cryptographic operations.

**Capabilities**:
- PKCE code verifier/challenge generation
- JWT signing and verification
- Key pair generation
- Random value generation

### 5. Platform Abstractions (`platform/`)
Platform dependency manager. Follows the Service Locator pattern.

**Supports**:
- Browser detection
- Node.js detection
- Storage abstraction (localStorage, sessionStorage, in-memory)
- URL parsing and manipulation

## 🔧 Development

### Building
```bash
# From package directory
yarn build              # Build ESM + types
yarn build:watch        # Watch mode

# Individual steps
yarn build:esm          # Rollup bundle
yarn build:types        # TypeScript definitions
```

### Testing
```bash
yarn test               # Run all tests
yarn test:unit          # Unit tests only
yarn test:browser       # Browser environment tests
yarn test:node          # Node.js environment tests
yarn test:watch         # Watch mode
```

### Linting
```bash
yarn lint
```

## 🏗️ Architecture Patterns

### Exports Strategy
This package uses **multi-entry exports** to provide different levels of API access:

1. **Public API** (`index.ts`): Stable, user-facing APIs
2. **Core API** (`core.ts`): Lower-level primitives
3. **Internal API** (`internal.ts`): For use by other monorepo packages only

### Platform Agnosticism
Code is written to work in both browser and Node.js environments:
- Use platform abstractions from `platform/`
- Avoid direct DOM or Node.js API calls
- Utilize environment-specific implementations via dependency injection

### Dependency Injection
Many components accept dependencies as constructor parameters to enable:
- Testing with mocks
- Platform-specific implementations
- Customization by higher-level packages

## 🧪 Testing Strategy

### Test Organization
- **Unit tests**: Co-located with source files in `test/`
- **Environment-specific tests**: Separated via Jest configs
- **Mocking**: Uses Jest mocks and `@repo/jest-helpers`

### Test Configurations
- `jest.config.js` - Base configuration (runs all tests)
- `jest.browser.config.js` - Browser environment simulation
- `jest.node.config.js` - Node.js environment

### Writing Tests
```typescript
// Example test structure
describe('Token', () => {
  it('should parse access token', () => {
    // Arrange
    const tokenString = '...';
    
    // Act
    const token = Token.parse(tokenString);
    
    // Assert
    expect(token.accessToken).toBe('...');
  });
});
```

## 🔗 Integration with Other Packages

### Used By
- `@okta/oauth2-flows` - Uses token, HTTP, and OAuth2 utilities
- `@okta/spa-platform` - Uses token management, storage, and platform abstractions

### Consumption Pattern
```typescript
// From @okta/oauth2-flows or @okta/spa-platform
import { Token, FetchClient } from '@okta/auth-foundation';
import { /* internal APIs */ } from '@okta/auth-foundation/internal';
```

### Internal Consumption Pattern
```typescript
// Internal packages (like @okta/spa-platform) should always import `@okta/auth-foundation/core`
import { Token, FetchClient } from '@okta/auth-foundation/core';
```

## 📘 Key Concepts

### Token Types
- **Access Token**: OAuth2 access token (opaque or JWT)
- **ID Token**: OpenID Connect ID token (always JWT)
- **Refresh Token**: OAuth2 refresh token (opaque)

### DPoP (Demonstrating Proof-of-Possession)
DPoP binds tokens to a client's cryptographic key, preventing token theft attacks.

**Flow**:
1. Client generates a key pair
2. Sends public key in DPoP header with token request
3. Receives DPoP-bound access token
4. Must use private key to create DPoP proof for each API request

**Reference**: https://datatracker.ietf.org/doc/html/rfc9449

### PKCE (Proof Key for Code Exchange)
PKCE protects the authorization code flow from interception attacks.

**Flow**:
1. Generate random `code_verifier`
2. Create `code_challenge` from verifier
3. Send challenge with authorization request
4. Send verifier with token request

**Reference**: https://datatracker.ietf.org/doc/html/rfc7636

## 🚨 Common Gotchas

1. **Side Effects**: The package includes `oktaUserAgent.ts` as a side effect (sets User-Agent header)
2. **Internal APIs**: Do NOT use `/internal` exports outside of this monorepo
3. **ESM Only**: This package is ESM-only (no CommonJS builds)
4. **Platform Detection**: Some features require browser or Node.js - check platform before use

## 💡 Working with Claude

When modifying this package:

1. **Adding new utilities**: Consider if they belong in `utils/`, `crypto/`, or `platform/`
2. **Changing exports**: Update `package.json` exports AND the corresponding `.ts` file
3. **Platform-specific code**: Use platform abstractions, never direct `window` or `process` access
4. **Breaking changes**: This affects ALL dependent packages - coordinate carefully
5. **Testing**: Always add both browser and Node tests for new features

### Important Files
- `src/index.ts` - Public API surface
- `src/internal.ts` - Internal API for other packages
- `package.json` - Export paths and peer dependencies
- `rollup.config.mjs` - Build configuration

---

**Dependencies**: None (this is the foundation!)  
**Peer Dependencies**: None  
**Private**: Yes (not published to npm separately)