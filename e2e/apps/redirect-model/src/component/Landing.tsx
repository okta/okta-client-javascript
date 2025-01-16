import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Credential, Events }  from '@okta/spa-platform';
import { signIn, signOut } from '@/auth';
import { Token as TokenComponent } from '@/component/Token';


export function Landing () {
  const [count, setCount] = useState<number>(Credential.allIDs.length);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [defaultCred, setDefault] = useState<string | null>(Credential.default?.id ?? null);

  useEffect(() => {
    const updateHandler = () => {
      setCount(Credential.allIDs.length);
    };

    const defaultHandler = () => {
      setDefault(Credential.default?.id ?? null);
    };

    Credential.on(Events.CREDENTIAL_ADDED, updateHandler);
    Credential.on(Events.CREDENTIAL_REMOVED, updateHandler);
    Credential.on(Events.STORAGE_CLEARED, updateHandler);
    Credential.on(Events.DEFAULT_CHANGED, defaultHandler);

    return () => {
      Credential.off(Events.CREDENTIAL_ADDED, updateHandler);
      Credential.off(Events.CREDENTIAL_REMOVED, updateHandler);
      Credential.off(Events.STORAGE_CLEARED, updateHandler);
      Credential.off(Events.DEFAULT_CHANGED, defaultHandler);
    };
  }, [setCount, setCredential, setDefault]);

  const clear = () => {
    Credential.clear();
  };

  const selectCred = (id?: string) => {
    if (!id) {return;}
    const cred = Credential.with(id)!;
    setCredential(cred);
  };

  return (
    <main>
      <hr />
      <p>
        <Link to='/secured' data-e2e="withDefaultLink">withDefault</Link>
        <Link to='/secured/tag' data-e2e="withTagLink">withTag</Link>
        <Link to='/secured/custom' data-e2e="findCredentialLink">findCredential</Link>
      </p>
      <hr/>
      <p>
        <button onClick={() => signIn()} data-e2e="signInBtn">Sign In</button>
        <button onClick={() => signOut()} data-e2e="signOutBtn">Sign Out</button>
        <button onClick={clear} data-e2e="clearBtn">Clear</button>
      </p>
      <hr />
      <p>
        Credential count is: <span data-e2e="Credential.size">{count}</span>
      </p>
      <p>
        Default Credential:
        <span onClick={() => selectCred(Credential?.default?.id)} data-e2e="Credential.default">
        &nbsp;{defaultCred ? defaultCred : 'null'}
        </span>
      </p>
      <hr />
      <div>
        <div>
          <h3>All Credentials:</h3>
          <ul>
            {Credential.allIDs.map(id => (<li key={id} data-e2e={`cred:${id}`} onClick={() => selectCred(id)}>{id}</li>))}
          </ul>
        </div>
        <div>
          {!credential ? (<p>~ Select a Credential ~</p>) : (<TokenComponent credential={credential} />)}
        </div>
      </div>
    </main>
  );
}
