import { Token } from 'src/platform';
import { makeRawTestToken } from '../../helpers/makeTestResource';


// TODO: write some more tests
describe('Token', () => {

  it('can construct', () => {
    const t1 = new Token(makeRawTestToken());
    expect(t1).toBeInstanceOf(Token);
  });
});
