import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Credential }  from '@okta/spa-platform';
import { signIn, signOut } from '@/auth';
import { Token as TokenComponent } from '@/component/Token';


export function Landing () {
  const [credentialIds, setCredentialIds] = useState<string[]>([]);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [defaultCred, setDefault] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // sets "default" state values

      const credential = await Credential.getDefault();
      if (credential) {
        setDefault(credential.id);
      }

      const allIDs = await Credential.allIDs();
      setCredentialIds(allIDs);
    })();
  }, []);

  useEffect(() => {
    const updateHandler = async () => {
      const allIDs = await Credential.allIDs();
      setCredentialIds(allIDs);
    };

    const defaultHandler = ({ id }) => {
      setDefault(id);
    };

    Credential.on('credential_added', updateHandler);
    Credential.on('credential_removed', updateHandler);
    Credential.on('cleared', updateHandler);
    Credential.on('default_changed', defaultHandler);

    return () => {
      Credential.off('credential_added', updateHandler);
      Credential.off('credential_removed', updateHandler);
      Credential.off('cleared', updateHandler);
      Credential.off('default_changed', defaultHandler);
    };
  }, [setCredentialIds, setCredential, setDefault]);

  const clear = async () => {
    await Credential.clear();
  };

  const selectCred = async (id?: string) => {
    if (!id) {return;}
    const cred = await Credential.with(id)!;
    setCredential(cred);
  };

  const selectDefaultCred = async () => {
    const defaultCred = await Credential.getDefault();
    selectCred(defaultCred?.id);
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
        Credential count is: <span data-e2e="Credential.size">{credentialIds.length}</span>
      </p>
      <p>
        Default Credential:
        <span onClick={() => selectDefaultCred()} data-e2e="Credential.default">
        &nbsp;{defaultCred ? defaultCred : 'null'}
        </span>
      </p>
      <hr />
      <div>
        <div>
          <h3>All Credentials:</h3>
          <ul>
            {credentialIds.map(id => (<li key={id} data-e2e={`cred:${id}`} onClick={() => selectCred(id)}>{id}</li>))}
          </ul>
        </div>
        <div>
          {!credential ? (<p>~ Select a Credential ~</p>) : (<TokenComponent credential={credential} />)}
        </div>
      </div>
    </main>
  );
}
