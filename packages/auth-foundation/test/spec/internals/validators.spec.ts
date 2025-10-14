import {
  validateString,
  validateURL
} from 'src/internals/validators';


function testAgainstArbitaryInput (validatorFn) {
  expect(validatorFn('')).toBe(false);
  expect(validatorFn(1337)).toBe(false);
  expect(validatorFn(13.37)).toBe(false);
  expect(validatorFn([])).toBe(false);
  expect(validatorFn({})).toBe(false);
  expect(validatorFn(null)).toBe(false);
  expect(validatorFn(undefined)).toBe(false);
}

describe('validators', () => {
  test('validateString', () => {
    expect(validateString('foobar')).toBe(true);

    testAgainstArbitaryInput(validateString);
  });

  test('validateURL', () => {
    expect(validateURL('https://okta.com')).toBe(true);
    expect(validateURL('http://okta.com', true)).toBe(true);
    
    expect(validateURL('http://okta.com')).toBe(false);
    expect(validateURL('javascript:void(0)')).toBe(false);
    expect(validateURL('javascript:void(0)', true)).toBe(false);

    testAgainstArbitaryInput(validateURL);
  });
});
