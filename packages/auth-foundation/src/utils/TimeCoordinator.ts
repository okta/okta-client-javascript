/**
 * @module
 * @mergeModuleWith Core
 */

// https://stackoverflow.com/questions/43344819/reading-response-headers-with-fetch-api
// CORS requests are limited to the specific headers exposed. This by default will block the `date` header

import type { TimeInterval, EpochTimestamp, Seconds } from '../types/index.ts';
import { Platform } from '../platform/Platform.ts';


/**
 * Utility class for parse timestamps and performing time/date calculations
 * 
 * @group TimeCoordinator
 */
export class Timestamp {
  constructor (private ts: EpochTimestamp) {}

  static from (t: Timestamp): Timestamp;
  static from (t: Date): Timestamp;
  static from (t: EpochTimestamp): Timestamp;
  static from (t: EpochTimestamp | Date | Timestamp): Timestamp;
  static from (t: EpochTimestamp | Date | Timestamp): Timestamp {
    if (t instanceof Timestamp) {
      return new Timestamp(t.value);
    }
    if (t instanceof Date) {
      return new Timestamp(t.valueOf() / 1000);
    }

    if (typeof t !== 'number' || !Number.isFinite(t)) {
      throw new TypeError('Must be a number');
    }

    return new Timestamp(t);
  }

  get value (): EpochTimestamp {
    return this.ts;
  }

  get asDate (): Date {
    return new Date(this.ts * 1000);
  }

  isBefore (t: Timestamp): boolean;
  isBefore (t: Date): boolean;
  isBefore (t: EpochTimestamp): boolean;
  isBefore (t: EpochTimestamp | Date | Timestamp): boolean {
    t = Timestamp.from(t).value;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return this.ts < t - Platform.TimeCoordinator.clockTolerance;
  }

  isAfter (t: Timestamp): boolean;
  isAfter (t: Date): boolean;
  isAfter (t: EpochTimestamp): boolean;
  isAfter (t: EpochTimestamp | Date | Timestamp): boolean {
    t = Timestamp.from(t).value;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return this.ts > t + Platform.TimeCoordinator.clockTolerance;
  }

  timeSince (t: Timestamp): Seconds;
  timeSince (t: Date): Seconds;
  timeSince (t: EpochTimestamp): Seconds;
  timeSince (t: EpochTimestamp | Date | Timestamp): TimeInterval {
    t = Timestamp.from(t).value;
    return this.ts - t;
  }

  timeSinceNow () {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const now = Platform.TimeCoordinator.now();
    return this.ts - now.value;
  }
}

/**
 * @group TimeCoordinator
 */
export interface TimeCoordinator {
  clockSkew: Seconds;
  clockTolerance: Seconds;
  now: () => Timestamp;
}

/**
 * @group TimeCoordinator
 */
export class DefaultTimeCoordinator implements TimeCoordinator {
  #skew = 0;
  #tolerance = 0;

  get clockSkew (): Seconds {
    return this.#skew;
  }

  set clockSkew (skew: Seconds) {
    this.#skew = skew;
  }

  get clockTolerance (): Seconds {
    return this.#tolerance;
  }

  set clockTolerance (tolerance: Seconds) {
    this.#tolerance = tolerance;
  }

  now (): Timestamp {
    const now = Math.floor(Date.now() / 1000) + this.clockSkew;
    return new Timestamp(now);
  }
}
