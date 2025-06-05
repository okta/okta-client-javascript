import { toRelativeUrl } from 'src/utils/toRelativeUrl';


describe('toRelativeUrl', () => {
  it('truncates the origin from a url string', () => {
    expect(toRelativeUrl('http://localhost:8080/foo/bar')).toEqual('/foo/bar');
    expect(toRelativeUrl('http://localhost:8080/foo/bar?baz=1')).toEqual('/foo/bar?baz=1');
    expect(toRelativeUrl('http://localhost:8080/foo/bar#baz')).toEqual('/foo/bar#baz');
  });
});
