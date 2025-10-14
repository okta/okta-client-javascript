import { useEffect, useState } from 'react';
import { Credential, Token as TokenImpl } from '@okta/spa-platform';


export function Token ({ credential }: { credential: Credential }) {
  // adding token to React state so updating the token will trigger a re-render
  const [token, setToken] = useState<TokenImpl>(credential.token);
  const [tags, setTags] = useState<string[]>(credential.tags ?? [])

  useEffect(() => {
    const handler = ({ credential }: { credential: Credential }) => setToken(credential.token);
    Credential.on('credential_refreshed', handler);

    const tagsHandler = ({ id, tags }) => {
      if (id === credential.id) {
        setTags(tags);
      }
    }
    Credential.on('tags_updated', tagsHandler);

    return () => {
      Credential.off('credential_refreshed', handler);
      Credential.off('tags_updated', tagsHandler);
    };
  }, [setToken]);

  useEffect(() => {
    setToken(credential.token);
    setTags(credential.tags);
  }, [credential]);

  const remove = async () => {
    await credential.remove();
  };

  const setDefault = async () => {
    await Credential.setDefault(credential);
  };

  const introspect = (kind) => {
    credential.introspect(kind)
    .then(resp => console.log(resp))
    .catch(err => console.error(err));
  };

  const addTag = async () => {
    const response = await fetch('/api/messages?skip=1');
    const messages = await response.json();
    credential.setTags([...credential.tags, messages[0].split(' ')[0]]);
  };

  return (
    <div className='token'>
      <table>
        <tbody>
          <tr>
            <td>Access Token:</td>
            <td onClick={() => introspect('access_token')} data-e2e="accessToken">{token.accessToken}</td>
          </tr>
          {token?.idToken && (
            <tr>
              <td>ID Token:</td>
              <td onClick={() => introspect('id_token')} data-e2e="idToken">{token.idToken?.rawValue}</td>
            </tr>
          )}
          {token?.refreshToken && (
            <tr>
              <td>Refresh Token:</td>
              <td onClick={() => introspect('refresh_token')} data-e2e="refreshToken">{token.refreshToken}</td>
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
          <tr>
            <td>Tags</td>
            <td data-e2e="tags">{tags.join(', ')}</td>
          </tr>
        </tbody>
      </table>
      <p>
        <button onClick={addTag} data-e2e="addTagBtn">Add Tag</button>
        <button onClick={setDefault} data-e2e="setDefaultBtn">Set as Default</button>
        <button onClick={remove} data-e2e="deleteBtn">Remove</button>
      </p>
    </div>
  );
}
