const crypto = require('node:crypto');
const { TextEncoder, TextDecoder } = require('node:util');
import { randStr } from './helpers';

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => randStr(15),   // do not use actual crypto alg for testing to for speed
    // getRandomValues: () => new Uint8Array(8)
    getRandomValues: arr => crypto.randomBytes(arr.length),
    subtle: crypto.subtle
  }
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

global.fetch = () => {
  throw new Error(`
ERROR: FETCH CALL MADE TO OUTSIDE RESOURCE!
The test most likely has flawed logic, like a
missing resource request mock
  `);
}
