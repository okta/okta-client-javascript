import { Link, useOutletContext } from 'react-router-dom';
import { Credential } from '@okta/spa-platform';
import { Token as TokenComponent } from '@/component/Token';

function Nested () {
  const { credential } = useOutletContext() as { credential: Credential };

  return (<TokenComponent credential={credential} />);
}

export function Protected () {
  const { credential } = useOutletContext() as { credential: Credential };
  const refresh = () => credential.refresh();
  const revoke = () => credential.revoke();
  const userinfo = () => credential.userInfo();

  return (
    <>
      <h1 data-e2e="protected">This is a protected route!</h1>
      <p>
        <button onClick={refresh} data-e2e="refreshBtn">Refresh</button>
        <button onClick={revoke} data-e2e="revokeBtn">Revoke</button>
        <button onClick={userinfo} data-e2e="userinfoBtn">User Info</button>
      </p>
      <p>
        <Link to='/' data-e2e="backToHome">Back to Home</Link>
      </p>
      <div>
        <Nested />
      </div>
    </>
  );
}
