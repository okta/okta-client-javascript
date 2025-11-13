import { SessionLogoutFlow as SessionLogoutFlowBase } from '@okta/oauth2-flows';


const defaultOptions: SessionLogoutFlow.PostRedirectOptions = {
  parentElement: document.body
};

export class SessionLogoutFlow extends SessionLogoutFlowBase {

  static PerformPostRedirect (logoutUrl: URL, options: Partial<SessionLogoutFlow.PostRedirectOptions> = {}) {
    const { parentElement } = { ...defaultOptions, ...options };

    // purposely a Promise which never resolves (the redirect should occur first)
    return new Promise(() => {
      // clone URL to avoid editing the passed instance
      logoutUrl = new URL(logoutUrl);

      // create html form
      const form = document.createElement('form');

      // appends values to form body
      for (const [key, value] of logoutUrl.searchParams.entries()) {
        const input = document.createElement('input');

        input.name = key;
        input.value = decodeURIComponent(value);
        input.type = 'hidden';

        form.appendChild(input);
      }

      // clears search params from URL since they are already appeneded to form
      logoutUrl.search = '';

      // append submit
      const submit = document.createElement('input');
      submit.type = 'submit';
      form.appendChild(submit);

      // sets properties of form element
      form.method = 'POST';
      form.style.display = 'none';
      form.action = logoutUrl.href;
      parentElement.appendChild(form);

      // submit the form (triggering redirect)
      submit.click();
    });
  }
}

export namespace SessionLogoutFlow {
  export type PostRedirectOptions = {
    parentElement: HTMLElement;
  };
}
