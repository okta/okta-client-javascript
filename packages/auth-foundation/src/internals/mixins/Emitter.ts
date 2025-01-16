// import type { Constructor, Mixin } from '../../types';
// import { EventEmitter } from '../../utils/EventEmitter';

// // NOTE: not currently used or exported
// // many classes use emitters but mixins and type declarations don't
// // seem to mix(in) well

// export interface Emitter {
//   on: (...args: Parameters<EventEmitter['on']>) => void;
//   off: (...args: Parameters<EventEmitter['off']>) => void;
// }

// export function mEmitter<T extends Constructor<EventEmitter>>(
//   Emitter: T
// ) {
//   return class {
//     #emitter: EventEmitter = new Emitter();

//     on (...args: Parameters<EventEmitter['on']>): void {
//       this.#emitter.on(...args);
//     }

//     off (...args: Parameters<EventEmitter['off']>): void {
//       this.#emitter.off(...args);
//     }
//   };
// }

// export type mEmitter = Mixin<typeof mEmitter>;