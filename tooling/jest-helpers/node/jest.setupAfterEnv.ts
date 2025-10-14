import { expect } from '@jest/globals';

// References:
// https://jestjs.io/docs/expect#expectaddequalitytesterstesters

// required to comare Headers equality in `expect(spy).toHaveBeenCalledWith(...)` pattern
// https://developer.mozilla.org/en-US/docs/Web/API/Headers/entries
function areHeadersEqual (a: unknown, b: unknown): boolean | undefined {
  const isAHeader = a instanceof Headers;
  const isBHeader = b instanceof Headers;

  if (isAHeader && isBHeader) {
    for (const [key, aValue] of a.entries()) {
      const bValue = b.get(key);
      if (bValue !== aValue) {
        console.log(`Headers mismatch: ${key}: ${aValue} vs ${bValue}`);
        return false;
      }
    }
    for (const [key, bValue] of b.entries()) {
      const aValue = b.get(key);
      if (bValue !== aValue) {
        console.log(`Headers mismatch: ${key}: ${aValue} vs ${bValue}`);
        return false;
      }
    }

    return true;
  }
  else if (isAHeader === isBHeader) {
    return undefined;
  }
  else {
    return false;
  }
}

function areURLSearchParamsEqual (a: unknown, b: unknown): boolean | undefined {
  const isAHeader = a instanceof URLSearchParams;
  const isBHeader = b instanceof URLSearchParams;

  if (isAHeader && isBHeader) {
    for (const [key, aValue] of a.entries()) {
      const bValue = b.get(key);
      if (bValue !== aValue) {
        console.log(`URLSearchParam mismatch: ${key}: ${aValue} vs ${bValue}`);
        return false;
      }
    }
    for (const [key, bValue] of b.entries()) {
      const aValue = b.get(key);
      if (bValue !== aValue) {
        console.log(`URLSearchParam mismatch: ${key}: ${aValue} vs ${bValue}`);
        return false;
      }
    }

    return true;
  }
  else if (isAHeader === isBHeader) {
    return undefined;
  }
  else {
    return false;
  }
}


expect.addEqualityTesters([areHeadersEqual, areURLSearchParamsEqual]);
