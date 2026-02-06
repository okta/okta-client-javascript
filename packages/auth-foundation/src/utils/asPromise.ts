
export function eventAsPromise (target: EventTarget, event: string, shouldThrow: boolean = false) {
  return new Promise((resolve, reject) => {
    const fn = shouldThrow ? reject : resolve;
    target.addEventListener(event, fn);
  });
}
