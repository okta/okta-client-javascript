# Managing User Credentials

##### Store, retrieve, and change user credentials within your application

## Overview

The primary goal of using authentication APIs is to ultimately receive credentials for your users, allowing them to do something with your application. If you don’t have a way to save and retrieve those credentials for later use, your users would need to sign into your application every time they open it.

Since no two applications are alike and usage patterns vary widely, Okta’s Client JavaScript libraries expose several features that enable you to access and manage user credentials conveniently, while still affording you the ability to customize behavior to suit your needs.

## Introduction to the `Credential` class {#introduction}

Within the Client JavaScript libraries, a [Token](/api/auth-foundation/Token/classes/Token) instance is used to store information related to a user’s tokens, in particular the [`accessToken`](/api/auth-foundation/Token/classes/Token#accesstoken), which is used to perform authenticated requests. Tokens are easy to use, but managing their lifecycle can be cumbersome, so to simplify your development workflow, the [Credential](/api/auth-foundation/Credential/classes/Credential) class exists.

Instances of [Credential](/api/auth-foundation/Credential/classes/Credential) not only contain a reference to that user’s token, but expose convenience methods and properties to simplify common operations, such as [`refresh()`](/api/auth-foundation/Credential/classes/Credential#refresh), [`userInfo()`](/api/auth-foundation/Credential/classes/Credential#userinfo), and [`revoke()`](/api/auth-foundation/Credential/classes/Credential#revoke). To ensure these operations can function, an [OAuth2Client](/api/auth-foundation/OAuth2/classes/OAuth2Client) is automatically created on your behalf, which can be used to perform other operations as needed.

## Storing credentials {#storage}

When you first receive a [Token](/api/auth-foundation/Token/classes/Token), you can use the [`store()`](/api/auth-foundation/Credential/classes/Credential#store) static function to save the token to a storage location. This function lets you supply optional tags to assign to the token to simplify the process of retrieving those credentials at a later date.

If you know the unique ID for a given token, you can use the [`with()`](/api/auth-foundation/Credential/classes/Credential#with) function to retrieve an individual credential.

When multiple credentials are stored, the [`find()`](/api/auth-foundation/Credential/classes/Credential#find) method can be used to retrieve credentials based on custom tags or claims defined within the credential’s ID token.

## Working with the default credential {#default}

Once your user signs in, you as an application developer will want to do something with that user’s credentials. While you can retain the credential object and pass it around throughout your application, it is often convenient to have singleton access to this common object.

The [`getDefault`](/api/auth-foundation/Credential/classes/Credential#getdefault) static method does just that, providing common access to the default credential for the application. This value will additionally be persisted, ensuring you can quickly and conveniently determine if a sign-in screen needs to be presented, or if a user is already present.

As a convenience, if no other tokens are present in your application, the first [Token](/api/auth-foundation/Token/classes/Token) stored will automatically be assigned as the default. The default will automatically be set to `null` when its credential is removed using [`remove()`](/api/auth-foundation/Credential/classes/Credential#remove).

### Changing the default credential {#set-default}

If at some point you would like to change the default credential or sign in a new user, you can simply set a new value by calling [`setDefault`](/api/auth-foundation/Credential/classes/Credential#setdefault), and the value will be persisted.

One challenge in applications is responding to change, particularly when transitioning between signed-out and -in states. To that end, an `EventEmitter` event is broadcast whenever the default credential changes.

```typescript
Credential.on('default_changed', async ({ id }) => {
  if (id === null) {
    // User signed out
  }

  const credential = await Credential.with(id);
  // Do something with the user
});
```

## Removing credentials {#removing}

When you no longer need a credential (usually when a user chooses to sign out), there are two options within [Credential](/api/auth-foundation/Credential/classes/Credential):

* [`revoke()`](/api/auth-foundation/Credential/classes/Credential#revoke)
* [`remove()`](/api/auth-foundation/Credential/classes/Credential#remove)

Additionally, [`SessionLogoutFlow`](/api/oauth2-flows/SessionLogoutFlow/classes/SessionLogoutFlow) can be used to terminate a user's session.

### When to use `SessionLogoutFlow` {#use-sessionlogout}

> [!IMPORTANT]
> Review [Concepts: Sessions](../concepts/sessions.md) to clarify the differences between session types.

When utilizing __OIDC__ (this cannot be used with only OAuth2), [`SessionLogoutFlow`](/api/oauth2-flows/SessionLogoutFlow/classes/SessionLogoutFlow) can be used to terminate both the application's session _and_ the __IDP__ session. This may not be desirable in __SSO__ scenarios, where the __IDP__ is protecting multiple applications. If you're looking to terminate only the application's session, use [`revoke()`](/api/auth-foundation/Credential/classes/Credential#revoke).

<!-- TODO: review this section -->
While [`SessionLogoutFlow`](/api/oauth2-flows/SessionLogoutFlow/classes/SessionLogoutFlow) terminates the __IDP__ session and revokes the corresponding tokens, it will not remove these tokens from storage. Use [`remove()`](/api/auth-foundation/Credential/classes/Credential#remove) before redirecting to ensure a clean state.

```typescript
const signOutFlow = new SessionLogoutFlow(...);
const credential = await Credential.getDefault();
const signOutUrl = await signOutFlow.start(credential.token?.idToken?.rawValue);
await credential.remove();
window.location.assign(signOutUrl);
```

### When to use `revoke` {#use-revoke}

When a token is no longer needed (usually when a user chooses to sign out), it's important to invalidate the token. [`revoke()`](/api/auth-foundation/Credential/classes/Credential#revoke) should be used to achieve this when an application's session is independent of the __IDP__ session.

> [!IMPORTANT]
> Make sure to revoke both the [`accessToken`](/api/auth-foundation/Token/classes/Token#accesstoken) and [`refreshToken`](/api/auth-foundation/Token/classes/Token#refreshtoken). Revoking only the [`accessToken`](/api/auth-foundation/Token/classes/Token#accesstoken) doesn't necessarily terminate the application's session if a [`refreshToken`](/api/auth-foundation/Token/classes/Token#refreshtoken) is available. The [`refreshToken`](/api/auth-foundation/Token/classes/Token#refreshtoken) can be used to request a new [`accessToken`](/api/auth-foundation/Token/classes/Token#accesstoken) without requiring user input therefore, the session is still active. Revoking the [`refreshToken`](/api/auth-foundation/Token/classes/Token#refreshtoken) prevents new tokens from being requested.
>
> The default behavior of [`revoke()`](/api/auth-foundation/Credential/classes/Credential#revoke) will revoke both tokens (resulting in two network requests).

<!-- > [!TIP]
> An invalidated access token can still be used to authenticate against a __Resource Server__ unless the server verifies incoming tokens against the Authorization Server via [introspect](/api/auth-foundation/OAuth2/classes/OAuth2Client#introspect). // TODO: finish this thought -->

### When to use `remove` {#use-remove}

Finally, at a minimum you can use the [`remove()`](/api/auth-foundation/Credential/classes/Credential#remove) function to simply remove that credential from storage. This will effectively make the application forget those tokens.

> [!IMPORTANT]
> Removing a credential from your application won’t invalidate it on the server. For that reason, it’s recommended to use [`revoke()`](/api/auth-foundation/Credential/classes/Credential#revoke) wherever possible.

## Managing multiple credentials {#multiple-credentials}

Changing the default credential doesn’t remove the old value from storage. Instead, all credentials that are stored are available. This can enable multiple user credentials to be used simultaneously.

### Working with multiple credentials {#working-with-credentials}

Several approaches to finding and using credentials are provided, depending upon your application use case. These facilities simplify the process of assigning different credentials to different tasks within your application.

#### Finding credentials by ID {#findby-id}

All tokens are automatically assigned a unique ID it can be identified by. This can be seen in the [`id`](/api/auth-foundation/Token/classes/Token#id) property (as well as through the [`id`](/api/auth-foundation/Credential/classes/Credential#id) property). This identifier may be used with the [`with`](/api/auth-foundation/Credential/classes/Credential#with) function.

```typescript
const credential = await Credential.with(id);
if (credential !== null) {
  // Do something with credential
}
```

The list of all stored IDs is available through the [`allIDs()`](/api/auth-foundation/Credential/classes/Credential#allids) static method.

#### Finding credentials by developer-assigned tags {#findby-tags}

When storing tokens, the [`store`](/api/auth-foundation/Credential/classes/Credential#store) function accepts an optional array of tags you can use to identify the purpose of different tokens. The [`find`](/api/auth-foundation/Credential/classes/Credential#find) function allows you to query tokens based on those tags at a later date. Furthermore, those tags can later be updated by changing the credential’s `tags` property.

```typescript
await Credential.store(newToken, ['service:purchase']);

// Later ...

const credential = (await Credential.find({ tags: 'service:purchase' }))[0];
if (credential) {
  // Use the credential
}
```

#### Finding credentials by ID Token claims {#findby-metadata}

If a token contains a valid ID token, the claims it represents are available within the `find()` method `matcher` function. The object provided to the `matcher` function contains the claims of the corresponding ID token, as well as other metadata associated with that [Token](/api/auth-foundation/Token/classes/Token).

```typescript
const userCredentials = await Credential.find(
  metadata => metadata.claims?.sub === 'jane.doe@example.com'
);
```

Additionally, all properties of [`Token.Metadata`](/api/auth-foundation/Token/namespaces/Token/type-aliases/Metadata) can be referenced as well.

```typescript
const serviceCredentials = await Credential.find(
  metadata => metadata.clientId === serviceClientId
);
```

## See Also

### `class` [`Credential`](/api/auth-foundation/Credential/classes/Credential)
###### Convenience object that provides methods and properties for using a user’s authentication tokens.