const crypto = require('node:crypto');
const { TextEncoder, TextDecoder } = require('node:util');
const { Request, Response } = require('@whatwg-node/fetch');
// const { BroadcastChannel } = require('worker_threads');
import { randStr } from './helpers';

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => randStr(15),   // do not use actual crypto alg for testing to for speed
    // getRandomValues: () => new Uint8Array(8)
    getRandomValues: arr => crypto.randomBytes(arr.length),
    subtle: crypto.subtle
  }
});

Object.defineProperty(global, 'structuredClone', {
  value: (obj) => JSON.parse(JSON.stringify(obj))
});

class MockBroadcastChannel implements BroadcastChannel {
  constructor(public name: string) {}

  onmessage = jest.fn();
  onmessageerror = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();
  postMessage = jest.fn();
  addEventListener = jest.fn();
  close = jest.fn();
}

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.BroadcastChannel = MockBroadcastChannel;
// console.log = () => {};

global.Request = Request;
global.Response = Response;
