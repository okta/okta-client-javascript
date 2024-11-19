import {
  EVENT_EXPIRED,
  EVENT_REFRESHED,
  EVENT_ADDED,
  EVENT_REMOVED,
  EVENT_CLEARED,
  EVENT_DEFAULT_CHANGED,
} from './constants';


type milliseconds = number;

// TODO: document
export type NowProvider = () => milliseconds;

export enum Events {
  CREDENTIAL_EXPIRED = EVENT_EXPIRED,
  CREDENTIAL_REFRESHED = EVENT_REFRESHED,
  CREDENTIAL_ADDED = EVENT_ADDED,
  CREDENTIAL_REMOVED = EVENT_REMOVED,
  STORAGE_CLEARED = EVENT_CLEARED,
  DEFAULT_CHANGED = EVENT_DEFAULT_CHANGED,
}

/**
 * kind of token
 */
export enum TokenKind {
  ACCESS = 'accessToken',
  ID = 'idToken',
  REFRESH = 'refreshToken'
}
