const { default: JSDOMEnv } = require('jest-environment-jsdom');

// NOTE: jsdom provides implementations of `Uint8Array` and `ArrayBuffer`
// therefore src code executing `x instanceof ArrayBuffer` in a test will
// return false because it's comparing jsdom's and nodejs's `Uint8Array`
// implementations. This overrides the jsdom environment to include the
// nodejs implementations, so the comparisons now work

// https://github.com/jsdom/jsdom/issues/2524#issuecomment-736672511
class CustomJSDomEnv extends JSDOMEnv {
  async setup () {
    await super.setup();
    this.global.Uint8Array = Uint8Array;
    this.global.ArrayBuffer = ArrayBuffer;
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.Headers = Headers;
    this.global.BroadcastChannel = BroadcastChannel;
    this.global.DOMException = DOMException;
  }
}

module.exports = CustomJSDomEnv;
