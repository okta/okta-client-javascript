import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { Credential } from '@okta/spa-platform';
import { signIn } from '@/auth';

type SecureRouteProps = {
  loadingElement: React.ReactElement
}

async function findCredential () {
  return Credential.default;
}

export const SecureRoute: React.FC<SecureRouteProps> = ({
  loadingElement,
}) => {
  const navigate = useNavigate();
  const [credential, setCredential] = useState<Credential | null>(null);

  useEffect(() => {
    (async () => {
      const cred = credential ?? await findCredential();

      if (cred) {
        try {
          await cred.refreshIfNeeded();
          setCredential(cred);
        }
        catch (err) {
          try {
            await cred.revoke();
          }
          catch (err) {
            cred.remove();
          }
          setCredential(null);
          navigate('/');
        }
      }
      else {
        await signIn(window.location.href);
      }
    })();
  }, []);

  if (credential && credential.token.isValid) {
    return (<Outlet context={{ credential }} />);
  }

  return loadingElement;
}
