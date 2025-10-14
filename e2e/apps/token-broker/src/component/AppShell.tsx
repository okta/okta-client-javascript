import { useState, useEffect } from 'react';
import { Outlet } from 'react-router';
import { initAuth, signOut } from '@/auth';
import { Loading } from './Loading';
import { TEST_revokeToken, TEST_removeAccessTokens } from '@/auth';
import { broker } from '@/broker';

let hasAuthenticated = false;

export function AppShell () {
  const [initalized, setInitalized] = useState<boolean>(false);

  useEffect(() => {
    if (!hasAuthenticated) {
      initAuth().then(() => {
        setInitalized(true);
      });

      hasAuthenticated = true;
    }
  }, [initAuth, setInitalized]);

  const handleSignOut = () => {
    signOut();
  };

  return (
    <main>
      <header className='App-header' data-e2e="ready">
        Token Broker Test App
      </header>
      <div>
        <hr />
        <div>
          <button onClick={handleSignOut} data-e2e="signOutBtn">Sign Out</button>
          <button onClick={TEST_removeAccessTokens} data-e2e="rmATsBtn">Remove ATs</button>
          <button onClick={TEST_revokeToken} data-e2e="rvkMordorTkn">Revoke Mordor Token</button>
        </div>
        <p>Broker Id: {broker.id}</p>
      </div>
      <hr />
      {!initalized && (<Loading />)}
      {initalized && (<Outlet />)}
    </main>
  );
}