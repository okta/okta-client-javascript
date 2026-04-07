# Okta OAuth2 Client SDKs - Monorepo

> **Status**: Beta  
> **Documentation**: https://okta-client-js.netlify.app/

This is a monorepo containing a collection of OAuth2 client libraries for JavaScript/TypeScript, designed to simplify OAuth2 integration in JavaScript applications.

## 📦 Package Architecture

This monorepo contains three interconnected packages:

### Foundation Layer
- **[@okta/auth-foundation](./packages/auth-foundation/claude.md)** - Core library providing foundational OAuth2 primitives, token handling, HTTP clients, and platform abstractions. All other packages depend on this.

### Token Acquisition Layer
- **[@okta/oauth2-flows](./packages/oauth2-flows/claude.md)** - Implements environment-agnostic OAuth2 authentication flows (Authorization Code, Logout).

### Platform/Management Layer
- **[@okta/spa-platform](./packages/spa-platform/claude.md)** - High-level utilities for managing token lifecycles, storage, browser tab synchronization, and making authenticated requests in browser/SPA environments.

### Dependency Graph
```
@okta/spa-platform
    ├─→ @okta/oauth2-flows (optional peer dependency)
    └─→ @okta/auth-foundation

@okta/oauth2-flows
    └─→ @okta/auth-foundation

@okta/auth-foundation
    (no dependencies)
```

## 🏗️ Monorepo Structure

```
okta-client-javascript/
├── packages/
│   ├── auth-foundation/     # Core foundation library
│   ├── oauth2-flows/        # OAuth2 flow implementations
│   └── spa-platform/        # SPA platform utilities
├── tooling/                 # Shared build/config packages
│   ├── eslint-config/
│   ├── jest-helpers/
│   ├── rollup-config/
│   └── typescript-config/
├── e2e/                     # End-to-end test applications
│   └── apps/
│       ├── redirect-model/
│       └── token-broker/
├── docs/                    # Documentation
└── scripts/                 # Build and automation scripts
```

## 🛠️ Technology Stack

- **Language**: TypeScript 5.9+
- **Module System**: ESM (ES Modules)
- **Package Manager**: Yarn (workspaces)
- **Build Orchestrator**: Turborepo
- **Build Tool**: Rollup (via shared config)
- **Type Generation**: TypeScript compiler
- **Testing**: Jest (with browser/node-specific configs)
- **Linting**: ESLint (via shared config)

## 🚀 Getting Started (Development)

### Prerequisites
- Node.js >= 20.11.0 (recommended: >= 22.13.1)
- Yarn >= 1.19.0

### Initial Setup
```bash
# Check Node version
node --version  # should be >=20

# Install all dependencies
yarn

# Build all packages
yarn build
```

### Development Workflow

```bash
# Build all packages in watch mode
yarn build:watch

# Run tests across all packages
yarn test

# Lint all packages
yarn lint

# Work on a specific package
cd packages/auth-foundation
yarn test:watch
```

### Package Build Process

Each package follows the same build pattern:
1. **ESM Bundle**: Rollup bundles TypeScript → ESM JavaScript
2. **Type Definitions**: TypeScript compiler generates `.d.ts` files
3. **Output**: `dist/esm/` (JavaScript) + `dist/types/` (TypeScript definitions)

## 📝 Shared Tooling Packages

All packages use shared configurations from the `tooling/` directory:

- `@repo/typescript-config` - Shared TypeScript configurations
- `@repo/rollup-config` - Shared Rollup build config
- `@repo/eslint-config` - Shared ESLint rules
- `@repo/jest-helpers` - Jest test utilities and mocks

These are internal workspace packages (not published) that ensure consistency across the monorepo.

## 🧪 Testing Strategy

### Test Environments
Each package supports multiple test environments:
- **Browser tests**: `jest.browser.config.js` - Simulates browser environment
- **Node tests**: `jest.node.config.js` - Runs in Node.js environment
- **Default**: `jest.config.js` - Runs all tests

### Running Tests
```bash
# From root - all packages
yarn test

# Specific package, specific environment
cd packages/auth-foundation
yarn test:browser  # Browser environment tests
yarn test:node     # Node.js environment tests
yarn test:watch    # Watch mode
```

## 📚 Working with the Codebase

### Adding Dependencies

```bash
# Add to a specific package
yarn workspace @okta/auth-foundation add <dependency>

# Add dev dependency
yarn workspace @okta/auth-foundation add -D <dependency>

# Add to root
yarn add -W <dependency>
```

### Creating a New Package

1. Create package directory: `packages/my-package/`
2. Add `package.json` with workspace references to shared configs
3. Set up `src/`, `test/`, `tsconfig.json`, `rollup.config.mjs`
4. Update root-level documentation

### Common Patterns

**Package Exports Structure**:
```json
{
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/esm/index.js"
    },
    "./submodule": {
      "types": "./dist/types/submodule.d.ts",
      "import": "./dist/esm/submodule.js"
    }
  }
}
```

**Internal vs Public APIs**:
- Some packages export `/internal` paths for use by other packages
- These should NOT be used by external consumers

## 🔐 Security & OAuth2 Concepts

### DPoP Support
The SDKs support **DPoP (Demonstrating Proof-of-Possession)** for enhanced security in OAuth2 flows. See package-specific documentation for implementation details.
Reference: https://datatracker.ietf.org/doc/html/rfc9449

### Token Types
- **Access Token**: Used for API authorization
- **ID Token**: Contains user identity information (JWT)
- **Refresh Token**: Used to obtain new access tokens

## 🎯 Sample Applications

Sample applications are located in `e2e/apps/`:

### Redirect Model (`e2e/apps/redirect-model`)
Demonstrates Authorization Code Flow using the redirect model.

### Token Broker (`e2e/apps/token-broker`)
Demonstrates obtaining an "all-scoped" token and using it to request downscoped access tokens.

### Running Samples
See [e2e/apps/README.md](./e2e/apps/README.md) for setup instructions, including:
- Configuring Okta applications
- Setting up `testenv` file with credentials
- Running the development server

## 📖 External Resources

- **API Documentation**: https://okta-client-js.netlify.app/
- **Repository**: https://github.com/okta/okta-client-javascript
- **Issues**: https://github.com/okta/okta-client-javascript/issues

## 💡 Working with Claude

When working on this codebase with Claude:

1. **For cross-package changes**: Reference this root `claude.md` for architecture and shared patterns
2. **For package-specific work**: Reference the individual package's `claude.md` file
3. **For OAuth2 flows**: Start with `@okta/oauth2-flows`
4. **For token management**: Look at `@okta/spa-platform`
5. **For core abstractions**: Dive into `@okta/auth-foundation`

### Key Files to Reference
- `turbo.json` - Turborepo task pipeline configuration
- `package.json` (root) - Workspace configuration
- Individual `package.json` files - Package-specific configs and dependencies

---

**Version**: 0.6.0 (all packages currently in sync)  
**License**: Apache-2.0  
**Maintainer**: jared.perreault@okta.com