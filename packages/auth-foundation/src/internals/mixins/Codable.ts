/**
 * @packageDocumentation
 * @internal
 */

import type { Constructor, Mixin } from '../../types/index.ts';
import { AuthSdkError } from '../../errors/index.ts';

// Ref: https://www.typescriptlang.org/docs/handbook/mixins.html#constrained-mixins

// NOTE: `Constructor<{ toJSON (): object }>` and `Constructor<{ toJSON: () => object }>` are NOT the same

/** @internal */
export function mEncodable<
  TBase extends Constructor<{ toJSON (): Record<string, unknown> }>
>(Base: TBase) {
  return class Encodable extends Base {
    encode (): string {
      return JSON.stringify(this.toJSON());
    }
  };
}

/** @internal */
export type mEncodable = Mixin<typeof mEncodable>;

/** @internal */
export function mDecodable<TBase extends Constructor>(Base: TBase) {
  return class Decodable extends Base {
    static decode<T> (encoded: string): T {
      try {
        const obj = JSON.parse(encoded);
        // `this` in static functions refers to the class
        // "return new this" is a cringe-worthy expression
        return new this(obj) as T;
      }
      catch (err) {
        throw new AuthSdkError('Unable to parse JSON');
      }
    }
  };
}

/** @internal */
export type mDecodable = Mixin<typeof mDecodable>;

/** @internal */
export function mCodable<
  TBase extends Constructor<{ toJSON (): Record<string, unknown> }>
>(Base: TBase) {
  return mEncodable(mDecodable(Base));
}

/** @internal */
export type mCodable = Mixin<typeof mCodable>;
