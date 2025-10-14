import { Token } from 'src/Token';
import { Credential } from 'src/Credential/Credential';
import { DefaultCredentialDataSource } from 'src/Credential/CredentialDataSource';

import { makeTestToken, makeTestCredential } from '../../helpers/makeTestResource';

interface TestContext {
  [key:string]: any;
}

describe('DefaultCredentialDataSource', () => {
  const context: TestContext = {};

  it('should construct', () => {
    const dataSrc = new DefaultCredentialDataSource(Credential);
    expect(dataSrc).toBeDefined();
    expect(dataSrc).toBeInstanceOf(DefaultCredentialDataSource);
  });

  describe('credentialFor', () => {
    beforeEach(() => {
      context.spy = jest.spyOn(DefaultCredentialDataSource.prototype as any, 'createCredential');
    });

    it('should return a new Credential instance', () => {
      const { spy } = context;
      const dataSrc = new DefaultCredentialDataSource(Credential);
      const token = makeTestToken();
      const metadata = Token.Metadata(token, ['foo']);
      const cred = dataSrc.credentialFor(token, metadata);
      expect(cred).toBeInstanceOf(Credential);
      expect(cred.tags).toEqual(['foo']);
      expect(dataSrc.size).toEqual(1);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return existing Credential instance', () => {
      const { spy } = context;
      const dataSrc = new DefaultCredentialDataSource(Credential);
      const token = makeTestToken();
      const cred1 = dataSrc.credentialFor(token);   // first call to load Cred in DataSource
      const cred2 = dataSrc.credentialFor(token);   // second call for test, should return same instance
      expect(cred1).toBeInstanceOf(Credential);
      expect(cred2).toBeInstanceOf(Credential);
      expect(cred2).toEqual(cred1);
      expect(dataSrc.size).toEqual(1);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('methods', () => {
    // prefills DataSource, methods are somewhat meaningless when empty
    beforeEach(() => {
      const t1 = makeTestToken();
      const t2 = makeTestToken();
      const t3 = makeTestToken();
      context.dataSrc = new DefaultCredentialDataSource(Credential);
      context.c1 = context.dataSrc.credentialFor(t1);
      context.c2 = context.dataSrc.credentialFor(t2);
      context.c3 = context.dataSrc.credentialFor(t3);
    });

    it('hasCredential', () => {
      const { c1, dataSrc } = context;
      const randomCred = makeTestCredential();
      expect(dataSrc.hasCredential(c1.token)).toEqual(true);
      expect(dataSrc.hasCredential(randomCred.token)).toEqual(false);
    });

    it('remove', () => {
      const { c1, dataSrc } = context;
      expect(dataSrc.size).toEqual(3);
      expect(dataSrc.hasCredential(c1)).toEqual(true);
      dataSrc.remove(c1);
      expect(dataSrc.size).toEqual(2);
      expect(dataSrc.hasCredential(c1)).toEqual(false);
      dataSrc.remove(c1);   // removing non-existing Credential no-ops
      expect(dataSrc.size).toEqual(2);
    });

    it('clear', () => {
      const { dataSrc } = context;
      expect(dataSrc.size).toEqual(3);
      dataSrc.clear();
      expect(dataSrc.size).toEqual(0);
    });

    it('size', () => {
      const { c1, dataSrc } = context;
      expect(dataSrc.size).toEqual(3);
      dataSrc.remove(c1);
      expect(dataSrc.size).toEqual(2);
    });
  });
});