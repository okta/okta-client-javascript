export function waitForRequest (spy) {
  const calls = spy.calls.length
  return browser.waitUntil(
    async () => spy.calls.length > calls, 
    { timeout: 5000, timeoutMsg: 'wait for ready selector' }
  );
}
