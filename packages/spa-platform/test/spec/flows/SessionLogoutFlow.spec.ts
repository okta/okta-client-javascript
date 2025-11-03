import { SessionLogoutFlow as Base } from '@okta/oauth2-flows';
import { SessionLogoutFlow } from 'src/flows';
import { oauthClient, makeTestToken } from '../../helpers/makeTestResource';


const params = {
  logoutRedirectUri: 'http://localhost:8080/logout/callback'
};

describe('SessionLogoutFlow', () => {
  it('constructs', async () => {
    const flow = new SessionLogoutFlow(oauthClient, params);
    expect(flow).toBeInstanceOf(SessionLogoutFlow);
    expect(flow).toBeInstanceOf(Base);
  });

  describe('PerformPostRedirect', () => {
    let htmlFormSubmitSpy = jest.fn().mockImplementation((e) => {
      e.preventDefault();
    });

    beforeEach(() => {
      jest.spyOn(oauthClient, 'openIdConfiguration').mockResolvedValue({
        issuer: 'http://localhost:8080/',
        authorization_endpoint: 'http://localhost:8080/oauth2/authorize',
        token_endpoint: 'http://localhost:8080/oauth2/token',
        end_session_endpoint: 'http://localhost:8080/oauth2/logout'
      });

      window.addEventListener('submit', htmlFormSubmitSpy);
    });

    it('will generate a dynamic html form submission to the generated logoutUrl', async () => {
      const token = makeTestToken();
      const flow = new SessionLogoutFlow(oauthClient, params);

      const logoutUrl = await flow.start(token.idToken!.rawValue);
      // Don't await, this Promise will never resolve
      const result = SessionLogoutFlow.PerformPostRedirect(logoutUrl);
      expect(result).toBeInstanceOf(Promise);

      expect(htmlFormSubmitSpy).toHaveBeenCalledTimes(1);   // test verifies a window submit event was fired
      expect(htmlFormSubmitSpy.mock.lastCall[0].submitter).toBeInstanceOf(HTMLInputElement);
      const formElement = htmlFormSubmitSpy.mock.lastCall[0].submitter.parentElement;
      expect(formElement).toBeInstanceOf(HTMLFormElement);
      expect(formElement.parentElement).toBe(window.document.body);
      expect(formElement.method).toBe('post');
      expect(formElement.action).toBe(logoutUrl.href.split('?')[0]);
      expect(formElement.elements.namedItem('id_token_hint').value).toBe(logoutUrl.searchParams.get('id_token_hint'));
      expect(formElement.elements.namedItem('post_logout_redirect_uri').value).toBe(logoutUrl.searchParams.get('post_logout_redirect_uri'));
      expect(formElement.elements.namedItem('state').value).toBe(logoutUrl.searchParams.get('state'));
    });

    it('will append the dynamic form to the provided element', async () => {
      const parentElement = document.createElement('div');
      document.body.appendChild(parentElement);

      const token = makeTestToken();
      const flow = new SessionLogoutFlow(oauthClient, params);

      const logoutUrl = await flow.start(token.idToken!.rawValue);
      // Don't await, this Promise will never resolve
      const result = SessionLogoutFlow.PerformPostRedirect(logoutUrl, { parentElement });
      expect(result).toBeInstanceOf(Promise);

      expect(htmlFormSubmitSpy).toHaveBeenCalledTimes(1);   // test verifies a window submit event was fired
      expect(htmlFormSubmitSpy.mock.lastCall[0].submitter).toBeInstanceOf(HTMLInputElement);
      const formElement = htmlFormSubmitSpy.mock.lastCall[0].submitter.parentElement;
      expect(formElement).toBeInstanceOf(HTMLFormElement);
      expect(formElement.parentElement).toBe(parentElement);
      expect(formElement.method).toBe('post');
      expect(formElement.action).toBe(logoutUrl.href.split('?')[0]);
      expect(formElement.elements.namedItem('id_token_hint').value).toBe(logoutUrl.searchParams.get('id_token_hint'));
      expect(formElement.elements.namedItem('post_logout_redirect_uri').value).toBe(logoutUrl.searchParams.get('post_logout_redirect_uri'));
      expect(formElement.elements.namedItem('state').value).toBe(logoutUrl.searchParams.get('state'));
    });

  });

});