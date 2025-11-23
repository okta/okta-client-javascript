/**
 * @module
 * @mergeModuleWith Core
 */

/** @internal */
export type Constructor<T = Record<string, unknown>> = new (...args: any[]) => T;
/** @internal */
export type AnyFunction<T = any> = (...args: any[]) => T;
/** @internal */
export type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>;
/** @internal */
export type Nullable<T> = { [K in keyof T]: T[K] | null };
/** @internal */
export type Neverable<T> = { [K in keyof T]: T[K] | never };
/** @internal */
export type Nullify<T> = { [K in keyof T]: null };
/** @internal */
export type Neverify<T> = { [K in keyof T]: never };

export type JsonPrimitive = string | number | boolean | null;
export type JsonRecord = { [key in string]?: Json | JsonPrimitive };
export type JsonArray = (Json | JsonPrimitive)[];
export type Json = JsonRecord | JsonArray;

export type Primitives<T> = {
  [K in keyof T]:
    // If T[K] is "something | undefined", map undefined along.
    undefined extends T[K] ?
      (T[K] extends Date ? number | undefined :
      T[K] extends URL ? string | undefined :
      T[K] extends JsonPrimitive ? T[K] :
      T[K] extends Array<infer U> ? Array<Primitives<U>> | undefined :
      T[K] extends object ? Primitives<T[K]> | undefined :
      never)
    :
      (T[K] extends Date ? number :
      T[K] extends URL ? string :
      T[K] extends JsonPrimitive ? T[K] :
      T[K] extends Array<infer U> ? Array<Primitives<U>> :
      T[K] extends object ? Primitives<T[K]> :
      never)
}

/** @internal */
export type SubSet<T extends Record<string, any>, K extends keyof T, R extends T[K]> = Omit<T, K> & { [P in K]: R }
/** 
 * @internal
 * Discrimintated Union
 * 
 * Required<Pick<T, K>> – The property K is required.
 * Partial<Record<Exclude<Keys, K>, undefined>> – All other keys in the union are explicitly set undefined (or omitted).
 * Omit<T, Keys> – All extra properties outside of Keys are freely allowed.
 * The union [K in Keys] ... [Keys] generates one type for each allowed key.
 */
export type DiscrimUnion<T, Keys extends keyof T = keyof T> = {
  [K in Keys]: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>> &  Omit<T, Keys>
}[Keys];

/**
 * A duration of time, in seconds
 */
export type TimeInterval = number;
/**
 * Number of seconds elapsed since midnight, Jan 1, 1970 UTC
 */
export type EpochTimestamp = number;
export type Seconds = number;

/**
 * An entity which can be respresented as a primitive (like string)
 */
export interface RawRepresentable<T = string> {
  get rawValue(): T;
}

/**
 * Defines utility methods to determine if an entity has expired
 * or when it will expire in the future
 */
export interface Expires {
  get expiresAt(): Date | undefined;
  get expiresIn(): TimeInterval;
  get isExpired(): boolean;
  get isValid(): boolean;
  get issuedAt(): Date | undefined;
}

/**
 * An entity which can be converted to a JSON representation, usually used for serialization
 */
export interface JSONSerializable {
  toJSON (): JsonRecord;
}

export type RequestAuthorizerInit = RequestInit & { dpopNonce?: string };
/**
 * An entity which can sign an outgoing {@link !Request}, minimally adding a `Authorization` header
 */
export interface RequestAuthorizer {
  authorize (input: string | URL | Request, init?: RequestAuthorizerInit): Promise<Request>;
}

/**
 * An entity which opens a communication channel (and therefore will need to close the channel)
 */
export interface Broadcaster {
  close (): void;
}

/**
 * A communication channel which follows a similar API pattern to {@link !BroadcastChannel}
 */
export interface BroadcastChannelLike<M extends JsonRecord, E = object> {
  name: string;
  onmessage: ((message: { data: M & E }, reply?: (data: M) => any) => any) | null;
  postMessage (message: M): void;
  close (): void;
}
