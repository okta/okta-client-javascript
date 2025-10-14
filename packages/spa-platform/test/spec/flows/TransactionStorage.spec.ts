import { AuthTransaction } from '@okta/oauth2-flows';
import { BrowserTransactionStorage } from 'src/flows/TransactionStorage';

AuthTransaction.storage = new BrowserTransactionStorage();

describe('BrowserTransactionStorage', () => {
  // TODO: tests

  describe('AuthTransaction', () => {
    it('will store authentication transactions', async () => {
      // Constructor / .state
      const ctx1 = new AuthTransaction();
      expect(ctx1).toBeInstanceOf(AuthTransaction);
      expect(ctx1.state).toBeDefined();
      expect(ctx1.state).not.toBe('');
      expect(ctx1.context).toMatchObject({ state: expect.any(String) });
    
      const ctx2 = new AuthTransaction({ foo: 1, state: 'statevalue' });
      expect(ctx2).toBeInstanceOf(AuthTransaction);
      expect(ctx2.state).toBe('statevalue');
      expect(ctx2.context).toMatchObject({ foo: 1, state: 'statevalue' });
    
      // .save()
      expect(localStorage.length).toBe(0);
      await ctx1.save();
      expect(localStorage.length).toBe(1);
      await ctx2.save();
      expect(localStorage.length).toBe(1);
    
      // static .load()
      expect(await AuthTransaction.load(ctx1.state)).toEqual(ctx1.context);
      expect(await AuthTransaction.load(ctx2.state)).toEqual(ctx2.context);
      expect(await AuthTransaction.load('foo')).toBe(null);
    
      // static .remove() / .clear()
      await AuthTransaction.remove(ctx1.state);
      expect(localStorage.length).toBe(1);
    
      await ctx2.delete();
      expect(localStorage.length).toBe(0);
    });
  });
});
