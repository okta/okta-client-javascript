[@okta/spa-platform](../..) / [Platform](../index.md) / Credential

# Class: Credential

A browser-specific extension of `@okta/auth-foundation` [Credential](/api/auth-foundation/Credential/)

## Remarks

Uses [BroadcastChannel](https://developer.mozilla.org/docs/Web/API/BroadcastChannel) to synchronize tokens across tabs. In testing environments, it may be
required to use [Credential.close](#close) to prevent open handles.

## See

Base Class: [Credential](/api/auth-foundation/Credential/)

## Extends

- [`Credential`](/api/auth-foundation/Credential/)

## Methods

### close()

> `static` **close**(): `void`

Closes the underlying [BroadcastChannel](https://developer.mozilla.org/docs/Web/API/BroadcastChannel), useful for testing environments to avoid open handles

#### Returns

`void`

#### See

[jest --detectOpenHandles](https://jestjs.io/docs/cli#--detectopenhandles)
