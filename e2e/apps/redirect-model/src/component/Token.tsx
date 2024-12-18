import { useEffect, useState } from 'react';
import { Credential, Events } from '@okta/spa-platform';
import { Token as TokenClass } from '@okta/auth-foundation';

export function Token ({ credential }) {
  // adding token to React state so updating the token will trigger a re-render
  const [token, setToken] = useState<TokenClass>(credential.token);

  useEffect(() => {
    const handler = ({ credential }: { credential: Credential }) => setToken(credential.token);
    Credential.on(Events.CREDENTIAL_REFRESHED, handler);

    return () => {
      Credential.off(Events.CREDENTIAL_REFRESHED, handler);
    }
  }, [setToken]);

  useEffect(() => {
    setToken(credential.token);
  }, [credential]);

  const remove = () => {
    credential.remove();
  };

  const setDefault = () => {
    Credential.default = credential;
  };

  const introspect = (kind) => {
    credential.introspect(kind)
    .then(resp => console.log(resp))
    .catch(err => console.error(err));
  };

  return (
    <div className='token'>
      <table>
        <tbody>
          <tr>
            <td>Access Token:</td>
            <td onClick={() => introspect('accessToken')} data-e2e="accessToken">{token.accessToken}</td>
          </tr>
          {token?.idToken && (
            <tr>
              <td>ID Token:</td>
              <td onClick={() => introspect('idToken')} data-e2e="idToken">{token.idToken?.rawValue}</td>
            </tr>
          )}
          {token?.refreshToken && (
            <tr>
              <td>Refresh Token:</td>
              <td onClick={() => introspect('refreshToken')} data-e2e="refreshToken">{token.refreshToken}</td>
            </tr>
          )}
          <tr>
            <td>Scopes:</td>
            <td>{token.scopes.join(' ')}</td>
          </tr>
          <tr>
            <td>Token Type:</td>
            <td>{token.tokenType}</td>
          </tr>
          <tr>
            <td>Expires In:</td>
            <td>{token.expiresIn}</td>
          </tr>
          <tr>
            <td>Expires At:</td>
            <td>{token.expiresAt.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <p>
        <button onClick={setDefault} data-e2e="setDefaultBtn">Set as Default</button>
        <button onClick={remove} data-e2e="deleteBtn">Remove</button>
      </p>
    </div>
  );
}
