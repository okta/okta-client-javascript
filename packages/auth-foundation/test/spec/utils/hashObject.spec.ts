import { hashObject } from 'src/utils/hashObject';


describe('objectHash', () => {
  it('hashes objects predictably', async () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 };
    const obj3 = { a: 1, b: 2, c: 3 };
    const obj4 = { a: 1 };
    const obj5 = { d: 4 };
    
    const hash1 = await hashObject(obj1);
    const hash2 = await hashObject(obj2);

    expect(hash1).toEqual(hash2);
    await expect(hashObject(obj3)).resolves.not.toEqual(hash1);
    await expect(hashObject(obj3)).resolves.not.toEqual(hash2);

    await expect(hashObject(obj4)).resolves.not.toEqual(hash1);
    await expect(hashObject(obj4)).resolves.not.toEqual(hash2);

    await expect(hashObject(obj5)).resolves.not.toEqual(hash1);
    await expect(hashObject(obj5)).resolves.not.toEqual(hash2);

    await expect(hashObject({})).resolves.toEqual('RBNvo1WzZ4oRRq0W9-hknpT7T8If536DEMBg9hyq_4o');

    const arrayHash = await hashObject({ foo: [ 1, 2, 3 ] });
    await expect(hashObject({ foo: [ 1, 2, 3 ] })).resolves.toEqual(arrayHash);
    await expect(hashObject({ foo: [ 3, 2, 1 ] })).resolves.toEqual(arrayHash);
    await expect(hashObject({ foo: [ 1 ] })).resolves.not.toEqual(arrayHash);
  });
});
