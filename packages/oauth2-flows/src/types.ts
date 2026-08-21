/**
 * Free-form contextual data persisted for the lifetime of an in-progress {@link Core!AuthenticationFlow | AuthenticationFlow},
 * such as an {@link AuthorizationCodeFlow!AuthorizationCodeFlow.Context | AuthorizationCodeFlow.Context}
 * @inline
 */
export type AuthContext = Record<string, any>;
