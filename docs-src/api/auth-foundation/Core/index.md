[@okta/auth-foundation](..) / Core

# Core

## Crypto

| Function | Description |
| ------ | ------ |
| [randomBytes](functions/randomBytes.md) | Generates a cryptographically random string |
| [shortID](functions/shortID.md) | Generates a cryptographically random short ID |

## Errors

| Class | Description |
| ------ | ------ |
| [APIClientError](classes/APIClientError.md) | Thrown when an [Networking.APIClient](../Networking/APIClient/index.md) encounters an unexpected condition |
| [AuthSdkError](classes/AuthSdkError.md) | Base Error class for all errors defined within Okta Client JavaScript |
| [CredentialError](classes/CredentialError.md) | Thrown when a [Credential](https://developer.mozilla.org/docs/Web/API/Credential) instance encounters an unexpected condition |
| [DPoPError](classes/DPoPError.md) | Thrown when a problem occurs during a token DPoP operation |
| [JWTError](classes/JWTError.md) | Thrown when a problem occurs during [JWT](classes/JWT.md) parsing or processing |
| [NetworkError](classes/NetworkError.md) | Thrown when a problem occurs when sending or processing a network request |
| [OAuth2Error](classes/OAuth2Error.md) | Thrown when an OAuth2 request (like /token) returns an error status |
| [TokenError](classes/TokenError.md) | Thrown when a [Token](../Token/index.md) instance encounters an unexpected condition |
| [TokenOrchestratorError](classes/TokenOrchestratorError.md) | Thrown when a [TokenOrchestrator](../TokenOrchestrator/index.md) encounters an unexpected condition |

## EventEmitter

| Name | Description |
| ------ | ------ |
| [Emitter](interfaces/Emitter.md) | Subscription-only view of an [EventEmitter](classes/EventEmitter.md), exposing just `on`/`off`. Useful for handing consumers a way to listen for events without also granting them the ability to `emit` or `relay` events. |
| [EventEmitter](classes/EventEmitter.md) | An object that implements the publish-subscribe pattern, allowing different parts of an application to communicate asynchronously through events |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [RawRepresentable](interfaces/RawRepresentable.md) | An entity which can be respresented as a primitive (like string) |
| [Expires](interfaces/Expires.md) | Defines utility methods to determine if an entity has expired or when it will expire in the future |
| [JSONSerializable](interfaces/JSONSerializable.md) | An entity which can be converted to a JSON representation, usually used for serialization |
| [RequestAuthorizer](interfaces/RequestAuthorizer.md) | An entity which can sign an outgoing [Request](https://developer.mozilla.org/docs/Web/API/Request), minimally adding a `Authorization` header |
| [Broadcaster](interfaces/Broadcaster.md) | An entity which opens a communication channel (and therefore will need to close the channel) |
| [BroadcastChannelLike](interfaces/BroadcastChannelLike.md) | A communication channel which follows a similar API pattern to [BroadcastChannel](https://developer.mozilla.org/docs/Web/API/BroadcastChannel) |

## JWT

| Name | Description |
| ------ | ------ |
| [IDTokenValidatorContext](interfaces/IDTokenValidatorContext.md) | Contextual data, usually from the `/authorize` request, which resulted in an ID token needed to validate said `ID Token` |
| [IDTokenValidator](interfaces/IDTokenValidator.md) | Performs ID token validation, conforming to [OIDC Spec](https://openid.net/specs/openid-connect-core-1_0.html) |
| [IDTokenValidator](namespaces/IDTokenValidator/index.md) | Performs ID token validation, conforming to [OIDC Spec](https://openid.net/specs/openid-connect-core-1_0.html) |
| [JWK](interfaces/JWK.md) | Defines properties of a JSON Web Key |
| [JWK](namespaces/JWK/index.md) | Defines properties of a JSON Web Key |
| [JWKS](type-aliases/JWKS.md) | Alias for `JWK[]`. |
| [JWKValidator](type-aliases/JWKValidator.md) | Verifies the signature of a [JWT](classes/JWT.md) signed by a [JWK](interfaces/JWK.md). |
| [JWTHeader](interfaces/JWTHeader.md) | Defines registered `JWT` header parameters. |
| [JWTPayload](interfaces/JWTPayload.md) | Defines registered `JWT` claim names. |
| [JWT](classes/JWT.md) | A class representation of a `JWT` |
| [TokenHashValidator](interfaces/TokenHashValidator.md) | A validator for validating tokens via hash claims. Used in OIDC to validate access tokens (`at_hash`) and device secrets (`ds_hash`) associated with an ID token |

## TimeCoordinator

| Name | Description |
| ------ | ------ |
| [Timestamp](classes/Timestamp.md) | Utility class for parse timestamps and performing time/date calculations |
| [TimeCoordinator](interfaces/TimeCoordinator.md) | A sourece-of-truth for the current time. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [JsonPrimitive](type-aliases/JsonPrimitive.md) | Primitive types representable in `JSON` objects. |
| [JsonRecord](type-aliases/JsonRecord.md) | Type respresentation of a `JSON` object. |
| [Json](type-aliases/Json.md) | Type respresentation of a `JSON` object or array. |
| [TimeInterval](type-aliases/TimeInterval.md) | A duration of time, in seconds |
| [EpochTimestamp](type-aliases/EpochTimestamp.md) | Number of seconds elapsed since midnight, Jan 1, 1970 UTC |
| [Seconds](type-aliases/Seconds.md) | Alias for `number`, but more descriptive |
| [RequestAuthorizerInit](type-aliases/RequestAuthorizerInit.md) | - |
| [EventListener](type-aliases/EventListener.md) | A [EventEmitter](classes/EventEmitter.md) listener `function`. |

## Utils

| Function | Description |
| ------ | ------ |
| [buildURL](functions/buildURL.md) | Utility function to build a URL from path segments |
| [hasSameValues](functions/hasSameValues.md) | Utility function to verify two arrays contain the same items |
| [doesPartialMatch](functions/doesPartialMatch.md) | Utility function to verify an object contains specific key/value pairs |
| [getSearchParam](functions/getSearchParam.md) | Extracts a query parameter from a [URLSearchParams](https://developer.mozilla.org/docs/Web/API/URLSearchParams) instance. Throws when more than one value exists for given parameter (which is allowed in the URI spec, but is not practiced in OAuth2) |
| [toRelativeUrl](functions/toRelativeUrl.md) | Utility function which converts a full URL to a relative path |
