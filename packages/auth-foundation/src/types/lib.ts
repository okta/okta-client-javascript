
export type Constructor<T = Record<string, unknown>> = new (...args: any[]) => T;
export type AnyFunction<T = any> = (...args: any[]) => T;
export type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>;

export type JsonPrimitive = string | number | boolean | null;
export type JsonRecord = Record<string, Json>;
export type Json = JsonPrimitive | Record<string, JsonPrimitive> | JsonPrimitive[];

export type TimeInterval = number;
export type EpochTimestamp = number;

// https://developer.apple.com/documentation/swift/rawrepresentable
export interface RawRepresentable<T = string> {
  get rawValue(): T;
}

export interface Expires {
  get expiresAt(): Date | undefined;
  get expiresIn(): TimeInterval;
  get isExpired(): boolean;
  get isValid(): boolean;
  get issuedAt(): Date | undefined;
}

// https://developer.apple.com/documentation/swift/encodable
export interface Encodable {
  encode (): string;
}

// In swift, this requires a specific signature of constructor
// https://developer.apple.com/documentation/swift/decodable
export interface Decodable {
  // TODO: static methods cannot be defined in an interface
  // https://stackoverflow.com/questions/13955157/how-to-define-static-property-in-typescript-interface
  // this interface may be meaningless in TS?
}

// https://developer.apple.com/documentation/swift/codable
export type Codable = Encodable & Decodable;
